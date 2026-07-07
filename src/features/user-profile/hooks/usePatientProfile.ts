"use client";

import { ResponseCode as rc } from "@/enum/response-code.enum";
import { SocketEventsEnum } from "@/enum/socket-events.enum";
import { getPatientProfile } from "@/features/user-profile/services/user-profile.api";
import { getStoredEmail, getStoredPatientId } from "@/features/user-profile/utils/user-storage";
import { getAccessToken } from "@/lib/authTokenStore";
import { createPatientProfileSocket } from "@/services/socket/socket-client";
import { PatientProfileDto } from "@/types/patientDTO/patient-profile.dto";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const USER_PROFILE_TABS = [
  "general-health",
  "personal-info",
  "password",
  "medical-detail",
  "appointment-history",
  "appointments",
  "notifications",
  "wallet",
] as const;

// Realtime room join is best-effort; never let a dead socket keep the page pending.
const ROOM_JOIN_TIMEOUT_MS = 8000;

// View-model hook: fetches and subscribes to patient profile updates.
export const usePatientProfile = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<PatientProfileDto | null>(null);
  const [activeTab, setActiveTab] = useState<string>("general-health");
  const [loading, setLoading] = useState(true);

  const queryTab = searchParams.get("tab");
  const initialTab = useMemo(() => {
    if (queryTab && USER_PROFILE_TABS.includes(queryTab as (typeof USER_PROFILE_TABS)[number])) {
      return queryTab;
    }

    return "general-health";
  }, [queryTab]);

  useEffect(() => {
    if (activeTab !== initialTab) {
      setActiveTab(initialTab);
    }
  }, [activeTab, initialTab]);

  const handleSetActiveTab = useCallback(
    (tab: string) => {
      if (!USER_PROFILE_TABS.includes(tab as (typeof USER_PROFILE_TABS)[number])) {
        return;
      }

      setActiveTab(tab);
      router.replace(`${pathname}?tab=${tab}`, { scroll: false });
    },
    [pathname, router]
  );

  useEffect(() => {
    const email = getStoredEmail();
    const accessToken = getAccessToken();
    console.log("[usePatientProfile] bootstrap", {
      hasAccessToken: Boolean(accessToken),
      hasEmail: Boolean(email),
      email,
    });
    if (!accessToken || !email) {
      console.log("[usePatientProfile] skip bootstrap because token/email is missing");
      setLoading(false);
      return;
    }

    const patientProfileSocket = createPatientProfileSocket();
    let mounted = true;
    let roomJoined = false;

    const fetchUserProfile = async () => {
      console.log("[usePatientProfile] http trigger start: getPatientProfile");
      try {
        const response = await getPatientProfile();
        console.log("[usePatientProfile] http trigger success", response);
        // Only adopt the HTTP body when it actually carries the profile. This endpoint
        // returns a pending-style response (data may be null) while the real profile
        // arrives via the PATIENT_PROFILE socket event — so never overwrite a
        // socket-delivered profile with a null HTTP payload.
        if (mounted && response?.code === rc.SUCCESS && response.data) {
          setUser(response.data);
          console.log("[usePatientProfile] profile state updated from HTTP response");
        }
      } catch {
        console.log("[usePatientProfile] http trigger failed");
        if (mounted) {
          toast.error("Can not fetch patient profile");
        }
      } finally {
        console.log("[usePatientProfile] http trigger finished");
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const handlePatientProfile = (data: unknown) => {
      console.log("[usePatientProfile] PATIENT_PROFILE event received", data);
      const payload = data as { code?: string; data?: PatientProfileDto };
      if (mounted && payload?.code === rc.SUCCESS) {
        setUser(payload.data || null);
        console.log("[usePatientProfile] profile state updated from socket event");
      }
    };

    const handleConnect = () => {
      console.log("[usePatientProfile] socket connected -> emit JOIN_ROOM");
      void patientProfileSocket.joinRoom();
    };

    const waitForRoomJoin = async () => {
      console.log("[usePatientProfile] waiting for ROOM_JOINED");
      const joined = await new Promise<boolean>((resolve) => {
        let settled = false;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const finish = (result: boolean) => {
          if (settled) {
            return;
          }
          settled = true;
          if (timer) {
            clearTimeout(timer);
          }
          patientProfileSocket.off(SocketEventsEnum.ROOM_JOINED, handleRoomJoined);
          patientProfileSocket.offConnect(handleConnect);
          resolve(result);
        };

        const handleRoomJoined = (data: unknown) => {
          console.log("[usePatientProfile] ROOM_JOINED event received", data);
          const payload = data as { email?: string } | undefined;
          if (payload?.email && payload.email !== email) {
            console.log("[usePatientProfile] ROOM_JOINED ignored because email does not match current user", {
              expectedEmail: email,
              receivedEmail: payload.email,
            });
            return;
          }

          roomJoined = true;
          console.log("[usePatientProfile] room join confirmed");
          finish(true);
        };

        patientProfileSocket.onConnect(handleConnect);
        console.log("[usePatientProfile] connect listener attached");
        patientProfileSocket.on(SocketEventsEnum.ROOM_JOINED, handleRoomJoined);
        console.log("[usePatientProfile] ROOM_JOINED listener attached");

        // Guard: a socket that never connects (e.g. prod WS blocked) must not keep
        // this promise — and its listeners — pending forever.
        timer = setTimeout(() => {
          console.warn("[usePatientProfile] ROOM_JOINED timed out -> continuing without realtime updates");
          finish(false);
        }, ROOM_JOIN_TIMEOUT_MS);

        const connected = patientProfileSocket.connect();
        console.log("[usePatientProfile] socket connect called", { connected });
        if (!connected) {
          console.log("[usePatientProfile] socket connect failed before join");
          finish(false);
          return;
        }

        if (patientProfileSocket.isConnected()) {
          console.log("[usePatientProfile] socket already connected -> emit JOIN_ROOM immediately");
          void patientProfileSocket.joinRoom();
        }
      });

      console.log("[usePatientProfile] ROOM_JOINED wait resolved", { joined });
      return joined;
    };

    const bootstrap = async () => {
      console.log("[usePatientProfile] bootstrap started");

      // GET /patients/me is event-driven (api-contract §7, README_SOCKET_REFACTOR_BE):
      // it only TRIGGERS the pipeline and returns a pending-style response; the full
      // profile is pushed via the PATIENT_PROFILE socket event to the email room.
      // Required order: attach listener -> JOIN_ROOM (await ROOM_JOINED) -> HTTP trigger.
      // If the trigger fires before the room is joined, the BE emits to a room we
      // haven't joined and the profile is missed ("Không tìm thấy hồ sơ").
      patientProfileSocket.on(SocketEventsEnum.PATIENT_PROFILE, handlePatientProfile);
      console.log("[usePatientProfile] PATIENT_PROFILE listener attached -> waiting for room join");

      // waitForRoomJoin carries an 8s timeout, so an unreachable socket resolves
      // (joined=false) instead of hanging the page forever.
      const joined = await waitForRoomJoin();
      if (!mounted) {
        return;
      }
      console.log("[usePatientProfile] room join settled -> firing HTTP trigger", { joined, roomJoined });

      // Fire the trigger regardless: when joined, this makes the BE emit
      // PATIENT_PROFILE (handled above); when the join timed out, it still resolves
      // `loading` (profile is unavailable without the socket, but the page won't hang).
      await fetchUserProfile();
    };

    void bootstrap();

    return () => {
      console.log("[usePatientProfile] cleanup start");
      mounted = false;
      patientProfileSocket.offConnect(handleConnect);
      patientProfileSocket.off(SocketEventsEnum.ROOM_JOINED);
      patientProfileSocket.off(SocketEventsEnum.PATIENT_PROFILE, handlePatientProfile);
      patientProfileSocket.off(SocketEventsEnum.PATIENT_PROFILE);
      console.log("[usePatientProfile] cleanup done");
    };
  }, []);

  return {
    user,
    loading,
    activeTab,
    setActiveTab: handleSetActiveTab,
    patientId: getStoredPatientId(),
    email: getStoredEmail(),
  };
};

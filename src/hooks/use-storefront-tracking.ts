import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";
  return "desktop";
};

const getVisitorId = (): string => {
  let visitorId = localStorage.getItem("storefront_visitor_id");
  if (!visitorId) {
    visitorId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("storefront_visitor_id", visitorId);
  }
  return visitorId;
};

export const useStorefrontTracking = (businessUserId: string | undefined) => {
  const tracked = useRef(false);

  useEffect(() => {
    if (!businessUserId || tracked.current) return;

    const trackVisit = async () => {
      try {
        tracked.current = true;
        
        await supabase.from("storefront_visits").insert({
          business_user_id: businessUserId,
          visitor_id: getVisitorId(),
          page_path: window.location.pathname,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
          device_type: getDeviceType(),
        });
      } catch (error) {
        console.error("Failed to track visit:", error);
      }
    };

    trackVisit();
  }, [businessUserId]);
};

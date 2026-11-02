"use client";

import { useEffect, useRef } from "react";
import { recordPropertyView } from "@/app/actions/property-views";

interface RecordPropertyViewProps {
  propertyId: string;
}

export default function RecordPropertyView({
  propertyId,
}: RecordPropertyViewProps) {
  const recordedPropertyId = useRef<string | null>(null);

  useEffect(() => {
    if (recordedPropertyId.current === propertyId) {
      return;
    }

    recordedPropertyId.current = propertyId;
    void recordPropertyView(propertyId);
  }, [propertyId]);

  return null;
}

import type {
  ComplaintCategory,
  ComplaintPriority,
} from "@/lib/constants/complaint";

/** Structured classification produced by the AI provider and stored on the complaint. */
export type ComplaintClassification = {
  category: ComplaintCategory;
  priority: ComplaintPriority;
  /** Short French justification for the selected priority. */
  explanation: string;
  /** Concrete intervention or next step recommended to staff. */
  recommendedAction: string;
};

export type ComplaintClassificationErrorCode =
  | "not_configured"
  | "timeout"
  | "provider_error"
  | "invalid_response";

export type ComplaintClassificationState =
  | { ok: true; classification: ComplaintClassification }
  | {
      ok: false;
      code: ComplaintClassificationErrorCode;
      /** Internal message for server logs; never shown to tenants. */
      message: string;
    };

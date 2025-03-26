
export type SuspensionDuration = "permanent" | "3days";

export interface ModerationAction {
  id: string;
  action_type: string;
  admin_id: string;
  target_id: string;
  target_type: string;
  details: Record<string, any>;
  created_at: string;
}

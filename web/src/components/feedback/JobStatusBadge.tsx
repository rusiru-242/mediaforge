import { JobStatus } from "@/types/api";
import { Badge } from "@/components/ui/Badge";
import { Clock, CheckCircle2, XCircle, AlertCircle, PlayCircle, Loader2 } from "lucide-react";

interface JobStatusBadgeProps {
  status: JobStatus;
}

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  switch (status) {
    case "PENDING":
      return (
        <Badge variant="warning" className="space-x-1">
          <Clock className="w-3 h-3" />
          <span>Pending</span>
        </Badge>
      );
    case "QUEUED":
      return (
        <Badge variant="info" className="space-x-1">
          <PlayCircle className="w-3 h-3" />
          <span>Queued</span>
        </Badge>
      );
    case "PROCESSING":
      return (
        <Badge variant="default" className="space-x-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Processing</span>
        </Badge>
      );
    case "COMPLETED":
      return (
        <Badge variant="success" className="space-x-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>Completed</span>
        </Badge>
      );
    case "FAILED":
      return (
        <Badge variant="error" className="space-x-1">
          <AlertCircle className="w-3 h-3" />
          <span>Failed</span>
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge variant="neutral" className="space-x-1">
          <XCircle className="w-3 h-3" />
          <span>Cancelled</span>
        </Badge>
      );
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}


import Link from "next/link";
import type { Job } from "@/types";
import { formatPrice, formatRelativeTime } from "@/lib/utils";
import { Clock, Users, Calendar } from "lucide-react";

interface JobCardProps {
  job: Job;
}

export function JobCard({ job }: JobCardProps) {
  return (
    <Link
      href={`/jobs/${job.slug}`}
      className="group block rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                job.status === "OPEN"
                  ? "bg-green-100 text-green-700"
                  : job.status === "IN_REVIEW"
                    ? "bg-yellow-100 text-yellow-700"
                    : job.status === "HIRED"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600"
              }`}
            >
              {job.status === "OPEN"
                ? "Terbuka"
                : job.status === "IN_REVIEW"
                  ? "Dalam Review"
                  : job.status === "HIRED"
                    ? "Dipekerjakan"
                    : job.status}
            </span>
          </div>
          <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 line-clamp-2 transition-colors">
            {job.title}
          </h3>
          <p className="mt-1.5 text-sm text-gray-600 line-clamp-2">
            {job.description}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-blue-600">
            {formatPrice(job.budget)}
          </p>
          <p className="text-xs text-gray-500">Budget</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
        {job.buyer && (
          <span>
            Oleh {job.buyer.firstName} {job.buyer.lastName}
          </span>
        )}
        {job.deadline && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Deadline: {new Date(job.deadline).toLocaleDateString("id-ID")}
          </span>
        )}
        {job._count?.proposals !== undefined && (
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {job._count.proposals}
            {job.maxProposals ? ` / ${job.maxProposals}` : ""} proposal
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatRelativeTime(job.createdAt)}
        </span>
      </div>

      {job.skills?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.skills.slice(0, 5).map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
            >
              {skill}
            </span>
          ))}
          {job.skills.length > 5 && (
            <span className="text-xs text-gray-400">
              +{job.skills.length - 5} lainnya
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

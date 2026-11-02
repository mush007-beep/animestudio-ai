"use client";

import Link from "next/link";
import JobList from "@/components/JobList";

export default function DashboardPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Job Queue</h1>
        <Link href="/scenes" className="btn text-sm">
          + New scene → queue
        </Link>
      </div>
      <JobList />
    </div>
  );
}

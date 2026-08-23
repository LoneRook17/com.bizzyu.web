import type { Metadata } from "next";
import { REQUEST_SCHOOL_BLURB, REQUEST_SCHOOL_HEADING } from "@/lib/request-school";

export const metadata: Metadata = {
  title: REQUEST_SCHOOL_HEADING,
  description: REQUEST_SCHOOL_BLURB,
};

export default function RequestSchoolLayout({ children }: { children: React.ReactNode }) {
  return children;
}

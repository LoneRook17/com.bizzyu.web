"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronRight, Mail, Search, X } from "lucide-react"
import { cn } from "@/lib/v2/utils"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Card } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Input } from "@/components/business/v2/ui/input"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import {
  HELP_SECTIONS, sectionText, type Block, type FAQ, type HelpSection, type SubSection,
} from "./content"

function matches(text: string, query: string) {
  return text.toLowerCase().includes(query.toLowerCase())
}

function BlockView({ block }: { block: Block }) {
  if (block.kind === "p") {
    return <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{block.text}</p>
  }
  if (block.kind === "note") {
    return (
      <p className="rounded-lg border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-3 py-2 text-sm leading-relaxed text-blue-900 dark:text-blue-300">
        {block.text}
      </p>
    )
  }
  const ListTag = block.kind === "ol" ? "ol" : "ul"
  return (
    <ListTag className={cn("space-y-1 pl-5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400", block.kind === "ol" ? "list-decimal" : "list-disc")}>
      {block.items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ListTag>
  )
}

function SubSectionView({ sub, searching }: { sub: SubSection; searching: boolean }) {
  const [open, setOpen] = useState(false)
  const expanded = searching || open
  return (
    <div className="scroll-mt-24" id={sub.id}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full items-center gap-2 py-2 text-left"
      >
        <ChevronRight className={cn("size-4 shrink-0 text-neutral-400 dark:text-neutral-500 transition-transform", expanded && "rotate-90")} />
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 transition-colors group-hover:text-[#05EB54] dark:group-hover:text-[#05EB54]">{sub.title}</h3>
      </button>
      {expanded && (
        <div className="flex flex-col gap-2.5 pb-3 pl-6">
          {sub.blocks.map((b, i) => (
            <BlockView key={i} block={b} />
          ))}
        </div>
      )}
    </div>
  )
}

function FAQView({ faq, searching }: { faq: FAQ; searching: boolean }) {
  const [open, setOpen] = useState(false)
  const expanded = searching || open
  return (
    <div className="border-b border-neutral-100 dark:border-neutral-800 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full items-start gap-2.5 py-3.5 text-left"
      >
        <ChevronRight className={cn("mt-0.5 size-4 shrink-0 text-neutral-400 dark:text-neutral-500 transition-transform", expanded && "rotate-90")} />
        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 transition-colors group-hover:text-[#05EB54] dark:group-hover:text-[#05EB54]">{faq.q}</span>
      </button>
      {expanded && <p className="pb-3.5 pl-[26px] text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{faq.a}</p>}
    </div>
  )
}

function SectionCard({ section, query }: { section: HelpSection; query: string }) {
  const [open, setOpen] = useState(false)
  const searching = query.length > 0
  const expanded = searching || open
  const Icon = section.icon

  const visibleSubs = section.subsections.filter(
    (sub) => !query || matches(sub.title, query) || sub.blocks.some((b) => matches(b.kind === "p" || b.kind === "note" ? b.text : b.items.join(" "), query))
  )
  const visibleFaqs = (section.faqs ?? []).filter((f) => !query || matches(f.q, query) || matches(f.a, query))

  return (
    <Card id={section.id} className="scroll-mt-24 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-green-50 dark:bg-green-950/40 text-[#05EB54]">
          <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-neutral-900 dark:text-neutral-100 transition-colors group-hover:text-[#05EB54] dark:group-hover:text-[#05EB54]">{section.title}</span>
          <span className="block text-[13px] text-neutral-500 dark:text-neutral-400">{section.intro}</span>
        </span>
        <ChevronDown className={cn("size-5 shrink-0 text-neutral-400 dark:text-neutral-500 transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="space-y-1 border-t border-neutral-100 dark:border-neutral-800 px-5 py-3">
          {visibleSubs.map((sub) => (
            <SubSectionView key={sub.id} sub={sub} searching={searching} />
          ))}
          {visibleFaqs.length > 0 && (
            <div className="pt-1">
              {visibleFaqs.map((faq, i) => (
                <FAQView key={i} faq={faq} searching={searching} />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

export default function V2HelpPage() {
  const [query, setQuery] = useState("")

  const filtered = useMemo(
    () => HELP_SECTIONS.filter((s) => !query || sectionText(s).includes(query.toLowerCase())),
    [query]
  )

  return (
    <>
      <PageHeader
        title="Help & tutorials"
        description="Everything you need to know about running your business on Bizzy."
        actions={
          <Button variant="secondary" asChild>
            <a href="mailto:support@bizzyu.com"><Mail /> Contact support</a>
          </Button>
        }
      />

      {/* Search */}
      <div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a topic, promo codes, refunds, Stripe…"
            className="h-11 pl-9 pr-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 transition-colors hover:text-neutral-600 dark:hover:text-neutral-400"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {query && (
          <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
            Showing {filtered.length} of {HELP_SECTIONS.length} sections matching “{query}”.
          </p>
        )}
      </div>

      <div className="flex gap-8">
        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No results found"
              description="Try a different search term or browse the sections below."
              action={<Button variant="secondary" size="sm" onClick={() => setQuery("")}>Clear search</Button>}
            />
          ) : (
            filtered.map((section) => <SectionCard key={section.id} section={section} query={query} />)
          )}
        </div>

        {/* Table of contents - desktop */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-8">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">On this page</h3>
            <nav className="flex flex-col gap-0.5">
              {HELP_SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="truncate rounded-md px-2 py-1 text-sm text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      </div>
    </>
  )
}

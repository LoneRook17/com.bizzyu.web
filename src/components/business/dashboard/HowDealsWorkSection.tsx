import Image from "next/image"

type Step = {
  img: string
  alt: string
  title: string
  desc: string
  highlight?: boolean
}

const STEPS: Step[] = [
  {
    img: "/images/screen-1.png",
    alt: "Student browsing deals on Bizzy",
    title: "Student finds your deal",
    desc: "They browse Bizzy, see your deal, and head to your business.",
  },
  {
    img: "/images/screen-3.png",
    alt: "Staff member taps the green button to verify the deal",
    title: "Your staff taps the green button",
    desc:
      'At checkout, the student shows their phone. Your staff must tap the green "Staff Member Tap Here" button. Takes 2 seconds.',
    highlight: true,
  },
  {
    img: "/images/screen-4d.png",
    alt: "Deal claimed confirmation screen",
    title: "Deal locks, discount applied",
    desc: "The deal is marked as claimed. Honor the discount at the register. Done.",
  },
]

export default function HowDealsWorkSection() {
  return (
    <section className="mb-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
        <div className="mb-4">
          <h2 className="text-base md:text-lg font-bold text-ink mb-0.5">
            How students claim your deal
          </h2>
          <p className="text-xs text-muted">
            Three steps. The middle one is on your staff.
          </p>
        </div>

        {/* Staff-tap callout — make it impossible to miss */}
        <div className="mb-5 rounded-lg border border-primary/30 bg-primary/5 p-3 flex gap-2.5">
          <div className="shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
            !
          </div>
          <div className="text-xs">
            <p className="font-semibold text-ink mb-0.5">
              Your staff must tap the green button on the student&rsquo;s phone.
            </p>
            <p className="text-muted">
              If staff doesn&rsquo;t tap{" "}
              <span className="font-semibold text-ink">
                &ldquo;Staff Member Tap Here&rdquo;
              </span>
              , the student can&rsquo;t claim the deal and you don&rsquo;t get
              credit for the redemption.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {STEPS.map((step, i) => (
            <div
              key={step.img}
              className="flex flex-col items-center text-center"
            >
              <div
                className={`relative w-[120px] md:w-[140px] h-[240px] md:h-[280px] mb-2 ${
                  step.highlight
                    ? "ring-2 ring-primary/30 rounded-[1.5rem]"
                    : ""
                }`}
              >
                <div className="absolute inset-0 bg-primary/5 rounded-[1.5rem] blur-xl scale-[0.85] -z-10" />
                <Image
                  src={step.img}
                  alt={step.alt}
                  fill
                  className="object-contain drop-shadow-md"
                />
              </div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className={`w-5 h-5 shrink-0 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    step.highlight
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-ink"
                  }`}
                >
                  {i + 1}
                </span>
                <h3 className="text-xs md:text-sm font-bold text-ink">
                  {step.title}
                </h3>
              </div>
              <p className="text-[11px] md:text-xs text-muted max-w-[200px]">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

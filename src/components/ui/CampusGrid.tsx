import AnimatedSection from "./AnimatedSection";

const CAMPUSES = [
  { name: "FGCU", location: "Fort Myers, FL" },
  { name: "USF", location: "Tampa, FL" },
  { name: "UGA", location: "Athens, GA" },
  { name: "ASU", location: "Tempe, AZ" },
];

export default function CampusGrid() {
  return (
    <div className="flex flex-wrap justify-center gap-4">
      {CAMPUSES.map((campus, i) => (
        <AnimatedSection key={campus.name} delay={i * 0.1}>
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-full px-6 py-3 shadow-sm hover:shadow-md hover:border-primary/40 transition-all">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <div>
              <span className="font-bold text-ink">{campus.name}</span>
              <span className="text-muted text-sm ml-2">{campus.location}</span>
            </div>
          </div>
        </AnimatedSection>
      ))}
    </div>
  );
}

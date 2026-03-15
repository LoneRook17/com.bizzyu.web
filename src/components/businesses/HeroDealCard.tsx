import Image from "next/image";

export default function HeroDealCard() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Green glow behind */}
      <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl scale-110 -z-10" />

      {/* Students photo - enlarged */}
      <div className="relative w-full max-w-[600px] lg:max-w-[680px]">
        <Image
          src="/images/bizzy-girls.jpeg"
          alt="College students holding Bizzy on their phones"
          width={680}
          height={510}
          className="rounded-3xl shadow-2xl object-cover w-full"
          priority
        />
      </div>
    </div>
  );
}

import { ReactNode } from "react";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export default function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100">
      <div className="w-14 h-14 bg-primary-light rounded-xl flex items-center justify-center mb-5">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-dark mb-3">{title}</h3>
      <p className="text-gray leading-relaxed">{description}</p>
    </div>
  );
}

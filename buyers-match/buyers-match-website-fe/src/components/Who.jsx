import React, { useState } from "react";
import AnimatedText from "./AnimatedText";
import { FadeUp } from "./Animations";
import smsfImg from "../assets/smsf_investors.avif";
import propertyImg from "../assets/property_investors.avif";
import ownerImg from "../assets/owner-occupiers.webp";
import firstHomeImg from "../assets/first-home-buyers.webp";
import renovationImg from "../assets/Renovation.webp";
import interstateImg from "../assets/interstate-buyers.webp";

const cardData = [
  {
    title: "Property Investors",
    desc: "Building property portfolios across Australia. We identify high-growth opportunities and optimize your investment strategy for maximum yield.",
    image: propertyImg,
    tag: "Investor Match",
  },
 
 
  {
    title: "Interstate Buyers",
    desc: "Invest anywhere in Australia with local knowledge on the ground. We are your eyes and ears in every market.",
    image: interstateImg,
    tag: "Nationwide",
  },
  {
    title: "SMSF Investors",
    desc: "Specialized property acquisition for Super Funds. Full compliance while maximizing long-term returns for your retirement portfolio.",
    image: smsfImg,
    tag: "Super Fund",
  },
   {
    title: "Renovators & Flippers",
    desc: "Find undervalued properties with strong renovation or flip potential. We source the deals others miss.",
    image: renovationImg,
    tag: "Value Add",
  },
   {
    title: "Owner Occupiers",
    desc: "Find and secure the right home without competing blind at auction. Expert advocacy on your side every step of the way.",
    image: ownerImg,
    tag: "Home Buyer",
  },
  {
    title: "First Home Buyers",
    desc: "Navigate your first purchase with expert guidance from day one. We simplify the complex so you buy with confidence.",
    image: firstHomeImg,
    tag: "First Purchase",
  },
];

const Who = () => {
  const [hovered, setHovered] = useState(null);

  return (
    <section id="who" className="py-24 bg-[#f7f5f0]">
      <div className="max-w-[1200px] mx-auto px-[5%]">
        {/* Header */}
        <FadeUp inView y={30} className="text-center mb-14">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[.15em] uppercase text-[#2ABFBF] mb-3 before:content-[''] before:w-[22px] before:h-[2px] before:bg-[#2ABFBF] before:rounded-[2px] before:shrink-0">
            Who We Help
          </div>
          <AnimatedText
            className="sec-h2"
            textParts={[
              { text: "Built for " },
              { text: "every type", em: true },
              { text: " of buyer" },
            ]}
          />
          <p className="text-[16px] text-[#7a8595] leading-[1.7] max-w-[560px] mx-auto">
            No matter where you are in your property journey, BuyersMatch has a
            service designed for your situation.
          </p>
        </FadeUp>

        {/* 3 x 2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cardData.map((card, i) => (
            <div
              key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className="group relative rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-default"
            >
              {/* Image top */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={card.image}
                  alt={card.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />

                {/* Dark overlay on hover */}
                <div
                  className={`absolute inset-0 bg-[#1B2A4A] transition-opacity duration-500 ${hovered === i ? "opacity-40" : "opacity-20"}`}
                />

                {/* Teal gradient bottom fade */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-16"
                  style={{
                    background:
                      "linear-gradient(to top, white 0%, transparent 100%)",
                  }}
                />

                {/* Tag pill top-right */}
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-[#1E9898] text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-teal-100">
                  {card.tag}
                </div>

                {/* Number badge top-left */}
                <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-[#1B2A4A]/80 backdrop-blur-sm flex items-center justify-center text-white text-[11px] font-black">
                  {String(i + 1).padStart(2, "0")}
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pt-4 pb-7">
                {/* Teal accent line */}
                <div
                  className="h-[2px] rounded-full mb-4 transition-all duration-500"
                  style={{
                    width: hovered === i ? "48px" : "28px",
                    background: "linear-gradient(90deg, #2ABFBF, #1E9898)",
                  }}
                />

                <h3 className="font-black text-[#1B2A4A] text-[17px] mb-2.5 leading-snug">
                  {card.title}
                </h3>

                <p className="text-gray-500 text-[13px] leading-relaxed mb-5">
                  {card.desc}
                </p>

                {/* Learn more link */}
              </div>

              {/* Bottom teal bar — slides up on hover */}
              <div
                className="absolute bottom-0 left-0 right-0 h-[3px] transition-transform duration-300 origin-left"
                style={{
                  background: "linear-gradient(90deg, #2ABFBF, #1E9898)",
                  transform: hovered === i ? "scaleX(1)" : "scaleX(0)",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Who;

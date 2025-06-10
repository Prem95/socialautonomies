"use client"

import { motion, useInView } from "framer-motion";
import Image from "next/image";
import { Calendar, Activity, Bot, LineChart, MessageSquare, Mic, Zap, Sparkles, BarChart, Clock, Users, Brain, Shield, Check, Lock, ArrowRight } from "lucide-react";
import * as React from "react";

function SectionHeading({ text, highlightedText }: { text: string; highlightedText: string }) {
  return (
    <h2 className="text-4xl md:text-4xl font-bold text-center mb-16 text-gray-900 tracking-[-0.01em] font-martian">
      {text} <span className="text-primary">{highlightedText}</span>
    </h2>
  );
}

// New OrganicGrowthDesign component
const OrganicGrowthDesign = () => (
  <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-4 bg-primary/5 rounded-xl overflow-hidden">
    {/* Main stem/center */}
    <motion.div
      className="w-1.5 sm:w-2 h-1/2 bg-primary/60 rounded-full absolute bottom-0 left-1/2 transform -translate-x-1/2"
      initial={{ height: "0%", opacity: 0 }}
      animate={{ height: "50%", opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
    />

    {/* Branches/Leaves - using framer-motion for staggered animation */}
    {[
      { size: 'w-6 h-6 sm:w-10 sm:h-10', x: '-70%', y: '-75%', delay: 0.7, bg: 'bg-primary/70' },
      { size: 'w-5 h-5 sm:w-8 sm:h-8', x: '70%', y: '-55%', delay: 0.9, bg: 'bg-primary/50' },
      { size: 'w-4 h-4 sm:w-6 sm:h-6', x: '-60%', y: '-15%', delay: 1.1, bg: 'bg-primary/60' },
      { size: 'w-3 h-3 sm:w-5 sm:h-5', x: '50%', y: '5%', delay: 1.3, bg: 'bg-primary/40' },
    ].map((branch, i) => (
      <motion.div
        key={`branch-${i}`}
        className={`${branch.size} ${branch.bg} rounded-full absolute top-1/2 left-1/2`}
        initial={{ opacity: 0, scale: 0.3, x: "-50%", y: "-50%" }}
        animate={{ opacity: 1, scale: 1, x: `calc(-50% + ${branch.x})`, y: `calc(-50% + ${branch.y})` }}
        transition={{ type: "spring", stiffness: 300, damping: 15, delay: branch.delay }}
      />
    ))}
    {/* A central "bud" or "fruit" growing at the top of the stem */}
     <motion.div
        className="w-8 h-8 sm:w-12 sm:h-12 bg-primary rounded-full absolute top-1/2 left-1/2 shadow-lg"
        initial={{ opacity: 0, scale: 0.3, x: "-50%", y: "-50%"}}
        // Positioned at the top of the stem (stem is 50% height, this is y: "-Y%" of its own size + offset for stem)
        animate={{ opacity: 1, scale: 1, x: "-50%", y: "-75%" }}
        transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.5 }}
    />
  </div>
);

// Feature box component for the bento grid
function FeatureBox({
  title,
  description,
  icon: Icon,
  large = false,
  imageUrl = null,
  customDesignElement = null
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  large?: boolean;
  imageUrl?: string | null;
  customDesignElement?: React.ReactNode;
}) {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.03, y: -5, boxShadow: "0px 10px 20px rgba(0,0,0,0.1)" }}
      className={`bg-white/30 backdrop-blur-lg border border-white/20 rounded-2xl p-6 md:p-8 shadow-soft relative overflow-hidden group ${large ? 'col-span-full md:col-span-2 md:row-span-2' : ''}`}
    >
      <div className="flex flex-col h-full">
        <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-xl md:text-2xl font-bold mb-3 text-gray-900 font-martian">{title}</h3>
        <p className={`text-gray-700 ${!(imageUrl || customDesignElement) ? 'flex-grow' : 'mb-6'}`}>{description}</p>

        {(imageUrl || customDesignElement) && (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl shadow-medium mt-auto">
            {customDesignElement ? (
              customDesignElement
            ) : imageUrl ? (
              <>
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-transparent z-10"></div>
                <Image
                  src={imageUrl}
                  alt={title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </>
            ) : null}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Schedule Tweet Box with calendar visualization
function ScheduleTweetBox() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.03, y: -5, boxShadow: "0px 10px 20px rgba(0,0,0,0.1)" }}
      className="bg-white/30 backdrop-blur-lg border border-white/20 rounded-2xl p-6 md:p-8 shadow-soft relative overflow-hidden"
    >
      <div className="flex flex-col h-full">
        <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
          <Calendar className="h-6 w-6" />
        </div>
        <h3 className="text-xl md:text-2xl font-bold mb-3 text-gray-900 font-martian">Schedule Tweets</h3>
        <p className="text-gray-700 mb-6">Generate and schedule tweets with 2 clicks</p>

        <div className="bg-gray-100 rounded-xl p-4 mt-auto">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-medium text-gray-800">June 2025</div>
            <div className="flex space-x-1">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <div key={`day-${i}`} className="text-gray-500 font-medium">{day}</div>
            ))}

            {Array.from({ length: 30 }, (_, i) => {
              const isPrimary = [3, 7, 12, 18, 24, 29].includes(i);
              const isToday = i === 15;
              return (
                <div
                  key={`date-${i}`}
                  className={`aspect-square flex items-center justify-center rounded-full text-xs ${isToday ? 'bg-primary text-white' :
                    isPrimary ? 'bg-primary/20 text-primary' : 'text-gray-700'
                    }`}
                >
                  {i + 1}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Intelligent Content Box
function IntelligentContentBox() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.03, y: -5, boxShadow: "0px 10px 20px rgba(0,0,0,0.1)" }}
      className="bg-white/30 backdrop-blur-lg border border-white/20 rounded-2xl p-6 md:p-8 shadow-soft relative overflow-hidden col-span-full md:col-span-1"
    >

      <div className="flex flex-col h-full">
        <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
          <Brain className="h-6 w-6" />
        </div>
        <h3 className="text-xl md:text-2xl font-bold mb-3 text-gray-900 font-martian">Intelligent Content</h3>
        <p className="text-gray-700 mb-4">Agent that speaks your tone and content - Craft tweets with elements</p>

        <div className="flex flex-wrap gap-3 items-center py-3 my-2">
          {/* Green Tags */}
          {["Modern", "Profile", "Brand Name", "External Link", "Hashtags", "Image"].map(
            (text, index) => (
              <span
                key={`green-tag-${index}`}
                className="bg-emerald-500 hover:bg-emerald-600 transition-colors text-white text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-md cursor-default"
              >
                {text}
              </span>
            ),
          )}
        </div>
        <div className="flex items-start space-x-3 mt-2">
          <div className="bg-primary/20 p-2 rounded-full">
            <Bot className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-3 rounded-lg border border-gray-300 dark:border-slate-600 overflow-hidden w-full"> {/* Added w-full for clarity in isolation */}
            <div className="relative w-full aspect-[1.91/1] bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 flex flex-col justify-between p-4">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-300 via-blue-400 to-indigo-600 opacity-80"></div>

              {/* Content overlaid on the image/gradient */}
              <div className="relative z-10">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 grid grid-cols-2 gap-px">
                    <span className="bg-red-500"></span>
                    <span className="bg-green-500"></span>
                    <span className="bg-blue-500"></span>
                    <span className="bg-yellow-500"></span>
                  </span>
                  <span className="text-white font-semibold text-lg">@social_agent</span>
                </div>
                <div className="mt-1 mb-2">
                  <span className="text-white text-sm ">Latest phi-4 models from @microsoft, now available at huggingface.co/microsoft</span>
                </div>
              </div>

              <div className="relative z-10 mt-auto bg-black/50 backdrop-blur-sm p-2 rounded-md">
                <div className="flex items-center space-x-2">
                  {/* Placeholder for Hugging Face Emoji/Icon */}
                  <span className="text-xl">🤗</span>
                  <div>
                    <p className="text-xs text-gray-300">huggingface.co</p>
                    <p className="text-sm text-white font-medium">microsoft/phi-4 · Hugging Face</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Optional: "From domain.co" text below the card if needed */}
            {/* 
  <div className="p-2 text-xs text-gray-500 dark:text-slate-400 border-t border-gray-300 dark:border-slate-600">
    From huggingface.co
  </div>
  */}
          </div>
        </div>

      </div>
    </motion.div>
  );
}

export function FeaturesSection() {
  return (
    <section className="container mx-auto p-8 md:p-12 my-12 relative overflow-hidden">
      {/* Background elements for glassmorphism - OPTIONAL but enhances the effect */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-primary/20 rounded-full filter blur-3xl opacity-30 animate-pulse animation-delay-2000"></div>
      </div>

      {/* Section heading */}
      <div className="mb-16 text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3 }}
          className="text-primary font-semibold mb-2"
        >
        </motion.p>
        <SectionHeading
          text="Grow your Audience - "
          highlightedText="Organically"
        />
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* First row - 3 equal boxes */}
        <FeatureBox
          title="Organic Growth"
          description="Grow your account naturally with authentic engagement"
          icon={Users}
          customDesignElement={<OrganicGrowthDesign />}
        />

        <ScheduleTweetBox />

        <IntelligentContentBox />

        {/* Second row - 2 equal boxes side by side */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3 }}
          whileHover={{ scale: 1.03, y: -5, boxShadow: "0px 10px 20px rgba(0,0,0,0.1)" }}
          className="bg-white/30 backdrop-blur-lg border border-white/20 rounded-2xl p-6 md:p-8 shadow-soft relative overflow-hidden md:col-span-3/2"
        >
          <div className="flex flex-col h-full">
            <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
              <BarChart className="h-6 w-6" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold mb-3 text-gray-900 font-martian">Deep Analytics</h3>
            <p className="text-gray-700 mb-6">One Page Analytics for your Agent</p>

            <div className="bg-gray-100 rounded-xl p-4 mt-auto">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm font-medium text-gray-800">Growth Metrics</div>
                <div className="text-xs text-gray-500">Last 30 days</div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
                <div className="bg-white p-2 sm:p-3 rounded-lg min-w-0">
                  <div className="text-xs sm:text-xs text-gray-500 mb-1 truncate">Follow</div>
                  <div className="text-sm sm:text-lg font-bold text-gray-900 truncate">
                    <motion.span
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3 }}
                    >
                      +247
                    </motion.span>
                  </div>
                  <div className="text-xs text-green-600 flex items-center">
                    <motion.span
                      initial={{ x: -5, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                      className="truncate"
                    >
                      ↑ 24%
                    </motion.span>
                  </div>
                </div>
                <div className="bg-white p-2 sm:p-3 rounded-lg min-w-0">
                  <div className="text-xs sm:text-xs text-gray-500 mb-1 truncate">Likes</div>
                  <div className="text-sm sm:text-lg font-bold text-gray-900 truncate">
                    <motion.span
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    >
                      12.4%
                    </motion.span>
                  </div>
                  <div className="text-xs text-green-600 flex items-center">
                    <motion.span
                      initial={{ x: -5, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.3 }}
                      className="truncate"
                    >
                      ↑ 3.2%
                    </motion.span>
                  </div>
                </div>
                <div className="bg-white p-2 sm:p-3 rounded-lg min-w-0">
                  <div className="text-xs sm:text-xs text-gray-500 mb-1 truncate">Views</div>
                  <div className="text-sm sm:text-lg font-bold text-gray-900 truncate">
                    <motion.span
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                    >
                      24.5K
                    </motion.span>
                  </div>
                  <div className="text-xs text-green-600 flex items-center">
                    <motion.span
                      initial={{ x: -5, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.4 }}
                      className="truncate"
                    >
                      ↑ 18%
                    </motion.span>
                  </div>
                </div>
              </div>

              <div className="h-16 flex items-end">
                {[...Array(14)].map((_, i) => {
                  const height = Math.sin(i * 0.8) * 50 + 50;
                  return (
                    <motion.div
                      key={i}
                      className="flex-1 bg-primary rounded-t"
                      initial={{ height: 0 }}
                      whileInView={{ height: `${height}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.1 * i }}
                      style={{ opacity: 0.7 + (i % 3) * 0.1 }}
                    ></motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>

        {/* AutoRun feature - side by side with Analytics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3 }}
          whileHover={{ scale: 1.03, y: -5, boxShadow: "0px 10px 20px rgba(0,0,0,0.1)" }}
          className="bg-white/30 backdrop-blur-lg border border-white/20 rounded-2xl p-6 md:p-8 shadow-soft relative overflow-hidden md:col-span-3/2"
        >
          <div className="flex flex-col h-full">
            <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold mb-3 text-gray-900 font-martian">Auto-Engage</h3>
            <p className="text-gray-700 mb-6">Agent runs 24/7 tweeting and engaging with users organically</p>

            <div className="bg-gray-100 rounded-xl p-4 mt-auto">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium">Agent Status</div>
                <div className="flex items-center">
                  <span className="h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                  <span className="text-sm text-green-600 font-medium">Active</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-600">Tweets Today</div>
                  <div className="text-sm font-medium">
                    <motion.span
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3 }}
                    >
                      3/5
                    </motion.span>
                  </div>
                </div>
                <motion.div
                  className="w-full bg-gray-200 rounded-full h-2 overflow-hidden"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className="bg-primary h-2 rounded-full"
                    initial={{ width: '0%' }}
                    whileInView={{ width: '60%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.2 }}
                  ></motion.div>
                </motion.div>

                <div className="flex justify-between items-center mt-2">
                  <div className="text-xs text-gray-600">Engagements Today</div>
                  <div className="text-sm font-medium">
                    <motion.span
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    >
                      27/50
                    </motion.span>
                  </div>
                </div>
                <motion.div
                  className="w-full bg-gray-200 rounded-full h-2 overflow-hidden"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <motion.div
                    className="bg-primary h-2 rounded-full"
                    initial={{ width: '0%' }}
                    whileInView={{ width: '54%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.3 }}
                  ></motion.div>
                </motion.div>

                <div className="flex justify-between items-center mt-2">
                  <div className="text-xs text-gray-600">Next Tweet</div>
                  <div className="text-sm font-medium">
                    <motion.span
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, delay: 0.2 }}
                    >
                      In 3h 15m
                    </motion.span>
                  </div>
                </div>

                <div className="h-12 mt-4 flex items-end">
                  {[...Array(24)].map((_, i) => {
                    const height = Math.random() * 70 + 35;
                    return (
                      <motion.div
                        key={i}
                        className="flex-1 bg-primary rounded-t mx-[0.5px]"
                        initial={{ height: 0 }}
                        whileInView={{ height: `${height}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: 0.02 * i }}
                        style={{ opacity: 0.6 + (Math.random() * 0.4) }}
                      ></motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Secure Authentication box - third box in second row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3 }}
          whileHover={{ scale: 1.03, y: -5, boxShadow: "0px 10px 20px rgba(0,0,0,0.1)" }}
          className="bg-white/30 backdrop-blur-lg border border-white/20 rounded-2xl p-6 md:p-8 shadow-soft relative overflow-hidden md:col-span-1"
        >
          <div className="flex flex-col h-full">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3 }}
              className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary"
            >
              <Shield className="h-6 w-6" />
            </motion.div>

            <motion.h3
              initial={{ y: -10, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="text-xl md:text-2xl font-bold mb-3 text-gray-900 font-martian"
            >
              Secure Authentication
            </motion.h3>

            <motion.p
              initial={{ y: -5, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="text-gray-700 mb-6"
            >
              Combination of X API and Browser Authentication, applied securely
            </motion.p>

            <div className="bg-gray-100 rounded-xl p-4 mt-auto">
              <div className="flex items-center justify-between mb-4">
                <motion.div
                  className="flex items-center space-x-3"
                  initial={{ x: -10, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">X</span>
                  </div>
                  <div className="text-sm font-medium">Authentication Flow</div>
                </motion.div>

                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center"
                >
                  <Lock className="h-3 w-3 text-green-600" />
                </motion.div>
              </div>

              <div className="space-y-3">
                <motion.div
                  initial={{ opacity: 0, x: -15 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center space-x-2"
                >
                  <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="h-3 w-3 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-800">Connect to X and Browser Cookies</span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -15 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="flex items-center space-x-2"
                >
                  <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="h-3 w-3 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-800">Deploy Agent securely</span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -15 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="flex items-center space-x-2"
                >
                  <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="h-3 w-3 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-800">Track Analytics</span>
                </motion.div>

                <div className="relative h-1 bg-gray-200 rounded-full mt-4 overflow-hidden">
                  <motion.div
                    initial={{ width: '0%' }}
                    whileInView={{ width: '100%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: "easeInOut" }}
                    className="absolute inset-0 h-full bg-gradient-to-r from-blue-500 via-primary to-green-500 rounded-full"
                  ></motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 1.2 }}
                  className="flex justify-center mt-2"
                >
                  <div className="flex items-center text-xs text-primary font-medium">
                    <span>Secure connection</span>
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
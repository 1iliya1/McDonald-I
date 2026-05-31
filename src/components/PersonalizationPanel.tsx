import React from "react";
import { UserCheck, Zap, Moon, Sun, ShieldAlert, Award } from "lucide-react";
import { UserPreferences } from "../types";

interface PersonalizationPanelProps {
  currentPreferences: UserPreferences;
  onPreferencesChange: (prefs: UserPreferences) => void;
  isLoading: boolean;
}

export function PersonalizationPanel({
  currentPreferences,
  onPreferencesChange,
  isLoading
}: PersonalizationPanelProps) {
  
  const personas = [
    {
      name: "Sunrise Gym Diner",
      icon: Sun,
      color: "border-amber-400 bg-amber-50 text-amber-900",
      prefs: {
        timeOfDay: "morning" as const,
        dietaryGoals: ["High-Protein", "Under 500 kcal"],
        pastOrderIds: ["m10", "m7"], // egg mcmuffin, grilled chicken salad
        isLoyaltyMember: true,
        pointBalance: 450
      },
      desc: "Breakfast focus, high-protein & low calorie alerts."
    },
    {
      name: "Late Night Craving",
      icon: Moon,
      color: "border-indigo-400 bg-indigo-50 text-indigo-900",
      prefs: {
        timeOfDay: "night" as const,
        dietaryGoals: ["Classic", "Sweet"],
        pastOrderIds: ["m1", "m8", "m13"], // big mac, fries, oreo mcflurry
        isLoyaltyMember: true,
        pointBalance: 1650 // can redeem premium items
      },
      desc: "Double burgers, crispy sides & indulgent cold rewards."
    },
    {
      name: "Allergen & Health Conscious",
      icon: ShieldAlert,
      color: "border-emerald-400 bg-emerald-50 text-emerald-900",
      prefs: {
        timeOfDay: "afternoon" as const,
        dietaryGoals: ["Gluten-Free", "Vegetarian", "Under 500 kcal"],
        pastOrderIds: ["m7", "m12", "m8"], // salad, pie, fries
        isLoyaltyMember: false,
        pointBalance: 0
      },
      desc: "Strict screen highlights on gluten-free & veggie tokens."
    },
    {
      name: "Standard Diner",
      icon: UserCheck,
      color: "border-gray-300 bg-gray-50 text-gray-700",
      prefs: {
        timeOfDay: "afternoon" as const,
        dietaryGoals: [],
        pastOrderIds: [],
        isLoyaltyMember: true,
        pointBalance: 120
      },
      desc: "Standard signature menu display."
    }
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm max-w-7xl mx-auto my-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4 mb-4">
        <div>
          <h3 className="font-display font-bold text-base flex items-center gap-2 text-brand-dark">
            <Zap className="w-5 h-5 text-brand-yellow fill-brand-yellow" />
            Vibe Simulation Control Room
          </h3>
          <p className="text-xs text-gray-500">
            Click any persona to test how Google Gemini customizes promotional text, menu emphasis, and visual loyalty badges in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 animate-pulse">
              Gemini Personalizing...
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Personalized Active
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {personas.map((persona, idx) => {
          const isSelected =
            currentPreferences.timeOfDay === persona.prefs.timeOfDay &&
            currentPreferences.pointBalance === persona.prefs.pointBalance &&
            JSON.stringify(currentPreferences.dietaryGoals) === JSON.stringify(persona.prefs.dietaryGoals);
          
          const IconComponent = persona.icon;

          return (
            <button
              key={idx}
              onClick={() => onPreferencesChange(persona.prefs)}
              className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between h-32 ${
                isSelected
                  ? "border-brand-red bg-red-50/50 shadow-sm ring-1 ring-brand-red"
                  : "border-gray-200 hover:border-brand-yellow hover:bg-gray-50 bg-white"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display font-bold text-sm tracking-tight text-brand-dark">
                    {persona.name}
                  </span>
                  <div className={`p-1 rounded-lg ${isSelected ? "bg-brand-red text-white" : "bg-gray-100 text-gray-500"}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-normal line-clamp-2">
                  {persona.desc}
                </p>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-dotted border-gray-200/80">
                <span className="text-[10px] font-mono text-gray-400">
                  {persona.prefs.timeOfDay.toUpperCase()} · {persona.prefs.pointBalance} PTS
                </span>
                {isSelected && (
                  <span className="text-[10px] font-bold text-brand-red uppercase tracking-wider flex items-center gap-1">
                    Selected
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

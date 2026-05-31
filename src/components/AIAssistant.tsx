import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, X, Bot, User, Plus, ShoppingBag } from "lucide-react";
import { MenuItem, Message } from "../types";

interface AIAssistantProps {
  onAddToCart: (item: MenuItem) => void;
}

export function AIAssistant({ onAddToCart }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text: "Hello! I am your **Golden Arches AI Assistant**. Ask me anything! For example:\n* *'Something under 400 kcal and high protein'* \n* *'What is a delicious sweet item with no gluten?'* \n* *'What's good for a late night craving?'*",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: [
        "High protein under 500 kcal",
        "Gluten-free sweet treat",
        "Late night craving guide"
      ]
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Send chat history and current message to back-end
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: messages.slice(-6).map(m => ({ role: m.role, text: m.text })),
          message: textToSend
        })
      });

      if (!response.ok) {
        throw new Error("Failed to get response from server");
      }

      const data = await response.json();
      
      const botMessage: Message = {
        role: "model",
        text: data.text || "I was able to search our menu database but couldn't find a direct recommendation. Let me know if you would like me to list our best sellers!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedItems: data.suggestedItems || [],
        suggestions: textToSend.toLowerCase().includes("protein")
          ? ["Show me chicken items", "Low calorie drinks"]
          : ["View full breakfast menu", "Are fries gluten-free?"]
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("AI Assistant Error:", error);
      // Fallback response inside safety boundary
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: "My apologies, I ran into a connection error. Please make sure your server is running or try another query!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="ai-assistant-wrapper" className="fixed bottom-6 right-6 z-50">
      {/* Balloon Toggle Button */}
      {!isOpen && (
        <button
          id="ai-assistant-toggle"
          onClick={() => setIsOpen(true)}
          className="bg-brand-red text-white p-4 rounded-full shadow-2xl flex items-center justify-center gap-2 hover:bg-[#b51c12] hover:scale-105 transition-all outline-none border-2 border-brand-yellow hover:rotate-3"
        >
          <Sparkles className="w-5 h-5 text-brand-yellow animate-bounce" />
          <span className="font-display font-bold text-sm tracking-wide">Ask Arches AI</span>
        </button>
      )}

      {/* Floating Chat Box */}
      {isOpen && (
        <div
          id="ai-assistant-card"
          className="bg-white rounded-2xl shadow-2xl w-[360px] sm:w-[400px] h-[520px] flex flex-col overflow-hidden border border-gray-100 animate-in fade-in slide-in-from-bottom duration-300"
        >
          {/* Header */}
          <div className="bg-brand-dark text-white p-4 flex items-center justify-between border-b border-gray-800">
            <div className="flex items-center gap-2.5">
              <div className="bg-brand-red p-1.5 rounded-lg border border-brand-yellow">
                <Sparkles className="w-4 h-4 text-brand-yellow" />
              </div>
              <div>
                <h4 className="font-display font-bold text-sm text-brand-yellow">Golden Arches assistant</h4>
                <p className="text-xs text-gray-400">Powered by Gemini 3.5 Flash</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white hover:bg-gray-800 p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Node */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "model" && (
                  <div className="w-8 h-8 rounded-full bg-brand-red text-brand-yellow font-bold text-xs flex items-center justify-center shrink-0 border border-brand-yellow">
                    <Bot className="w-4 h-4 text-brand-yellow" />
                  </div>
                )}

                <div className="space-y-2 max-w-[80%]">
                  <div
                    className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-brand-red text-white rounded-tr-none"
                        : "bg-white text-brand-dark shadow-sm rounded-tl-none border border-gray-100"
                    }`}
                  >
                    {/* Render simple markdown bolding and italics */}
                    <div className="whitespace-pre-line text-xs font-sans">
                      {msg.text.split("\n").map((line, lIdx) => {
                        // Replace **text** with bold and *text* with italics
                        let formattedLine = line;
                        const boldRegex = /\*\*(.*?)\*\*/g;
                        const italicRegex = /\*(.*?)\*/g;

                        // Use simple parser
                        return (
                          <p key={lIdx} className="mb-1 last:mb-0">
                            {line.split(" ").map((word, wIdx) => {
                              if (word.startsWith("**") && word.endsWith("**")) {
                                return <strong key={wIdx} className="font-bold text-brand-gold">{word.replace(/\*\*/g, "")} </strong>;
                              }
                              if (word.startsWith("*") && word.endsWith("*")) {
                                return <em key={wIdx} className="italic text-gray-500">{word.replace(/\*/g, "")} </em>;
                              }
                              return word + " ";
                            })}
                          </p>
                        );
                      })}
                    </div>
                  </div>

                  {/* Suggested menu items horizontal scroll */}
                  {msg.suggestedItems && msg.suggestedItems.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 mt-1 scrollbar-thin max-w-full">
                      {msg.suggestedItems.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white p-2.5 rounded-xl border border-gray-200 shrink-0 w-[135px] hover:shadow-md transition-shadow relative group"
                        >
                          <div className="text-xl mb-1">{item.image}</div>
                          <h5 className="font-display font-semibold text-xs leading-tight truncate text-brand-dark">
                            {item.name}
                          </h5>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-xs font-mono font-bold text-brand-red">
                              ${item.price.toFixed(2)}
                            </span>
                            <button
                              onClick={() => {
                                onAddToCart(item);
                               // Play cute bounce
                              }}
                              className="bg-brand-yellow text-brand-dark p-1 rounded-md hover:bg-brand-red hover:text-white transition-colors"
                              title="Add to order"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Suggestion prompt chips */}
                  {msg.suggestions && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {msg.suggestions.map((suggestion, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => handleSendMessage(suggestion)}
                          className="bg-[#faf5eb] hover:bg-[#fff9e6] hover:border-brand-yellow/50 border border-gray-200/60 rounded-full px-2.5 py-1 text-[11px] font-medium text-amber-900 transition-colors cursor-pointer"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="text-[10px] text-gray-400 block ml-1">
                    {msg.timestamp}
                  </span>
                </div>

                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-brand-yellow text-brand-dark font-bold text-xs flex items-center justify-center shrink-0 border border-amber-300">
                    <User className="w-4 h-4 text-brand-dark" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-brand-dark text-brand-yellow font-bold text-xs flex items-center justify-center shrink-0 border border-brand-yellow animate-spin">
                  <Sparkles className="w-4 h-4 text-brand-yellow" />
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm text-sm text-gray-500 rounded-tl-none">
                  <span className="flex items-center gap-1">
                    Analyzing recipes
                    <span className="animate-pulse">...</span>
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="p-3 border-t border-gray-100 flex items-center gap-2 bg-white"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything (e.g. wheat-free burger)..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow/40 focus:border-brand-yellow font-sans placeholder-gray-400"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="bg-brand-red text-white p-2.5 rounded-full hover:bg-[#b51c12] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

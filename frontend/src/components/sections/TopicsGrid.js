import React from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Bot, Palette, Zap, LineChart, CreditCard, Shield, ArrowRight, Package,
  Mail, FileText, Smartphone, TestTube2, Blocks, Server,
  Code, Brain, Cpu, Network, Terminal, Mic, CheckCircle, Camera,
  Database, Globe, Activity, Gamepad2
} from "lucide-react";

const iconMap = {
  Bot, Palette, Zap, LineChart, CreditCard, Shield, Mail, FileText,
  Smartphone, TestTube2, Blocks, Server, Code, Brain, Cpu, Network,
  Terminal, Mic, CheckCircle, Camera, Database, Globe, Activity,
  Gamepad: Gamepad2, Gamepad2,
};

export const TopicsGrid = ({ topics, loading }) => {
  const navigate = useNavigate();

  return (
    <section className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Browse by Topic</h2>
            <p className="text-muted-foreground mt-1">Explore curated tools by category.</p>
          </div>
          <Link to="/tools" className="hidden md:flex items-center gap-1 font-semibold text-sm hover:text-primary" data-testid="view-all-topics">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="neo-card p-5 flex items-center gap-4 animate-pulse">
                <div className="w-12 h-12 bg-muted border-2 border-border flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted/50 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {topics.map(topic => {
            const IconComponent = iconMap[topic.icon] || Package;
            return (
              <button
                key={topic.topic_id}
                onClick={() => navigate(`/topics/${topic.topic_id}`)}
                className={`neo-card p-5 text-left flex items-center gap-4 text-foreground ${topic.bg_color} hover:border-primary transition-colors`}
                data-testid={`topic-${topic.topic_id}`}
              >
                <div className="w-12 h-12 bg-background border-2 border-foreground flex items-center justify-center flex-shrink-0">
                  <IconComponent className={`w-6 h-6 ${topic.color}`} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-bold">{topic.name}</h3>
                  <p className="text-sm text-foreground/60">{topic.tool_count} repos</p>
                </div>
              </button>
            );
          })}
        </div>
        )}
      </div>
    </section>
  );
};

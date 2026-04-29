"use client";

import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, Zap, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { suggestSecurePassword } from '@/ai/flows/suggest-secure-password-flow';

interface PasswordToolProps {
  passwordValue: string;
  onSelectSuggestion: (password: string) => void;
}

export function PasswordTool({ passwordValue, onSelectSuggestion }: PasswordToolProps) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [strength, setStrength] = useState(0);

  useEffect(() => {
    // Simple strength calculation logic
    let score = 0;
    if (passwordValue.length > 8) score += 25;
    if (passwordValue.length > 12) score += 15;
    if (/[A-Z]/.test(passwordValue)) score += 20;
    if (/[0-9]/.test(passwordValue)) score += 20;
    if (/[^A-Za-z0-9]/.test(passwordValue)) score += 20;
    setStrength(score);
  }, [passwordValue]);

  const handleGetSuggestion = async () => {
    setLoading(true);
    try {
      const result = await suggestSecurePassword({ criteria: "extremely secure, gaming theme possible, memorable" });
      setSuggestion(result.password);
    } catch (error) {
      console.error("Failed to fetch suggestion", error);
    } finally {
      setLoading(false);
    }
  };

  const getStrengthLabel = () => {
    if (strength === 0) return 'Enter a password';
    if (strength < 40) return 'Weak';
    if (strength < 70) return 'Medium';
    if (strength < 90) return 'Strong';
    return 'Secure';
  };

  const getStrengthColor = () => {
    if (strength < 40) return 'bg-destructive';
    if (strength < 70) return 'bg-yellow-500';
    return 'bg-secondary';
  };

  return (
    <div className="space-y-3 mt-2 p-3 rounded-lg bg-muted/30 border border-primary/10">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span>STRENGTH: <span className={strength >= 70 ? 'text-secondary' : strength < 40 ? 'text-destructive' : 'text-yellow-500'}>{getStrengthLabel()}</span></span>
        </div>
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2 text-[10px] text-primary hover:text-primary hover:bg-primary/10 uppercase tracking-widest font-bold"
          onClick={handleGetSuggestion}
          disabled={loading}
        >
          {loading ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />}
          AI Suggest
        </Button>
      </div>

      <Progress value={strength} className={`h-1.5 ${getStrengthColor()}`} />

      {suggestion && (
        <div className="animate-in slide-in-from-top-2 fade-in duration-300 flex items-center justify-between gap-2 p-2 rounded bg-primary/10 border border-primary/20">
          <code className="text-xs text-primary font-mono">{suggestion}</code>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-secondary hover:bg-secondary/20"
            onClick={() => {
              onSelectSuggestion(suggestion);
              setSuggestion(null);
            }}
          >
            <Check className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
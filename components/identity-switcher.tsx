"use client";

import { useRef } from "react";
import { Check, ChevronDown, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Identity } from "@/lib/types";

export interface IdentityOption {
  value: Identity;
  label: string;
  detail: string;
}

/** Posts to /api/identity, which sets the sandbox cookie and redirects to the right start page. */
export function IdentitySwitcher({ current, options }: { current: Identity; options: IdentityOption[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const active = options.find((o) => o.value === current) ?? options[0];

  return (
    <form ref={formRef} method="post" action="/api/identity">
      <input ref={inputRef} type="hidden" name="as" defaultValue={current} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" data-testid="identity-trigger" className="bg-card">
            <UserRound aria-hidden />
            <span className="hidden text-muted-foreground sm:inline">Viewing as</span>
            <span className="font-medium">{active.label}</span>
            <ChevronDown aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Switch demo identity</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              data-testid={`identity-${option.value}`}
              onSelect={() => {
                if (!inputRef.current || !formRef.current) return;
                inputRef.current.value = option.value;
                formRef.current.submit();
              }}
              className="flex items-start gap-2"
            >
              <Check className={option.value === current ? "mt-0.5 opacity-100" : "mt-0.5 opacity-0"} aria-hidden />
              <span className="flex flex-col">
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.detail}</span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </form>
  );
}

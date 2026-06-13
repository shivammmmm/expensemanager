import React, { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

function buildUniqueClients(clients) {
  const arr = Array.isArray(clients) ? clients : [];

  return [
    ...new Map(
      arr
        .map((c) => {
          const name = String(c?.name ?? "").trim();
          if (!name) return null;

          return [
            name.toLowerCase(),
            {
              ...c,
              name,
            },
          ];
        })
        .filter(Boolean)
    ).values(),
  ];
}

export default function ClientCombobox({
  clients,
  value,
  onChange,
  placeholder = "Select client...",
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const uniqueClients = useMemo(
    () => buildUniqueClients(clients),
    [clients]
  );

  const selectedClient = uniqueClients.find(
    (c) => c.name.toLowerCase() === String(value || "").toLowerCase()
  );

  const filteredClients = uniqueClients.filter((client) =>
    client.name.toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = uniqueClients.some(
    (client) =>
      client.name.toLowerCase() === search.trim().toLowerCase()
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <span className="truncate">
            {selectedClient
              ? selectedClient.name
              : value || placeholder}
          </span>

          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <Command>
          <CommandInput
            placeholder="Search or create client..."
            value={search}
            onValueChange={setSearch}
          />

          <CommandList className="max-h-64 overflow-y-auto">
            <CommandEmpty>
              No clients found.
            </CommandEmpty>

            <CommandGroup>
              {filteredClients.map((client) => (
                <CommandItem
                  key={client.id || client.name}
                  value={client.name}
                  onSelect={() => {
                    onChange(client.name);
                    setSearch("");
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.toLowerCase() ===
                        client.name.toLowerCase()
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />

                  <span className="truncate">
                    {client.name}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>

            {search.trim() && !exactMatch && (
              <CommandGroup className="border-t">
                <CommandItem
                  value={search}
                  onSelect={() => {
                    onChange(search.trim());
                    setSearch("");
                    setOpen(false);
                  }}
                  className="cursor-pointer font-medium text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />

                  <span className="truncate">
                    Create new client "{search.trim()}"
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
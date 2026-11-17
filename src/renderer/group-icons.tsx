import React from "react";
import {
  Columns3,
  Heart,
  Star,
  House,
  Briefcase,
  MessageCircle,
  Music,
  Gamepad2,
  Mail,
  Video,
  Code,
  Globe,
  BookOpen,
  Camera,
  Coffee,
  Folder,
  Rocket,
  Sun,
  Moon,
  CalendarDays,
  Users,
  ShoppingBag,
  Wrench,
  Layers,
} from "lucide-react";
import { groupIconIds, type GroupIconId } from "../shared/group-icons";
const icons = {
  columns: Columns3,
  heart: Heart,
  star: Star,
  home: House,
  work: Briefcase,
  chat: MessageCircle,
  music: Music,
  game: Gamepad2,
  mail: Mail,
  video: Video,
  code: Code,
  globe: Globe,
  book: BookOpen,
  camera: Camera,
  coffee: Coffee,
  folder: Folder,
  rocket: Rocket,
  sun: Sun,
  moon: Moon,
  calendar: CalendarDays,
  users: Users,
  shopping: ShoppingBag,
  tools: Wrench,
  layers: Layers,
};
const labels: Record<GroupIconId, string> = {
  columns: "Spalten",
  heart: "Herz",
  star: "Stern",
  home: "Zuhause",
  work: "Arbeit",
  chat: "Chat",
  music: "Musik",
  game: "Spiele",
  mail: "Post",
  video: "Video",
  code: "Code",
  globe: "Internet",
  book: "Lesen",
  camera: "Kamera",
  coffee: "Pause",
  folder: "Ordner",
  rocket: "Rakete",
  sun: "Sonne",
  moon: "Mond",
  calendar: "Kalender",
  users: "Team",
  shopping: "Einkaufen",
  tools: "Werkzeuge",
  layers: "Ebenen",
};
export function GroupIcon({
  id,
  size = 20,
}: {
  id: GroupIconId;
  size?: number;
}) {
  const Icon = icons[id] ?? Columns3;
  return <Icon size={size} />;
}
export function GroupIconPicker({
  selected,
  onSelect,
}: {
  selected: GroupIconId;
  onSelect: (id: GroupIconId) => void;
}) {
  return (
    <div className="group-icon-grid">
      {groupIconIds.map((id) => (
        <button
          key={id}
          type="button"
          title={labels[id]}
          aria-label={labels[id]}
          aria-pressed={selected === id}
          onClick={() => onSelect(id)}
        >
          <GroupIcon id={id} size={24} />
          <span>{labels[id]}</span>
        </button>
      ))}
    </div>
  );
}

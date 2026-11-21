import { t, locale, setLanguage } from "../shared/i18n";
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
  columns: "Columns",
  heart: "Heart",
  star: "Star",
  home: "Home",
  work: "Work",
  chat: "Chat",
  music: "Music",
  game: "Games",
  mail: "Mail",
  video: "Video",
  code: "Code",
  globe: "Internet",
  book: "Reading",
  camera: "Camera",
  coffee: "Pause",
  folder: "Folder",
  rocket: "Rocket",
  sun: "Sun",
  moon: "Moon",
  calendar: "Calendar",
  users: "Team",
  shopping: "Shopping",
  tools: "Tools",
  layers: "Layers",
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
          title={t(labels[id])}
          aria-label={t(labels[id])}
          aria-pressed={selected === id}
          onClick={() => onSelect(id)}
        >
          <GroupIcon id={id} size={24} />
          <span>{t(labels[id])}</span>
        </button>
      ))}
    </div>
  );
}

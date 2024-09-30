import React from 'react';
import { Badge } from "@/components/ui/badge";

interface TagsProps {
  tags: string[];
  selectedTags: string[];
  onTagSelect: (tag: string) => void;
}

export function Tags({ tags, selectedTags, onTagSelect }: TagsProps) {
  // Filter out empty tags
  const filteredTags = tags.filter(tag => tag.trim() !== '');

  return (
    <div className="flex flex-wrap gap-2">
      <Badge
        key="all"
        variant={selectedTags.length === 0 ? "default" : "outline"}
        className="cursor-pointer"
        onClick={() => onTagSelect('all')}
      >
        All
      </Badge>
      {filteredTags.map((tag) => (
        <Badge
          key={tag}
          variant={selectedTags.includes(tag) ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => onTagSelect(tag)}
        >
          {tag}
        </Badge>
      ))}
    </div>
  );
}
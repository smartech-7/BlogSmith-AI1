
import { PenTool } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-card border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center">
        <PenTool className="h-8 w-8 text-primary mr-3" />
        <h1 className="text-3xl font-bold text-foreground">BlogSmith AI</h1>
      </div>
    </header>
  );
}

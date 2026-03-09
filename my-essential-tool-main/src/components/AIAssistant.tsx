import React, { useState, useRef, useEffect } from "react";
import { Bot, MessageSquare, X, Send, Minimize2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hi! I'm your Revenue Growth Management AI assistant. How can I help you today?",
      timestamp: new Date(),
    }
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, isMinimized]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm a demo AI assistant for the RGM system. I can't actually process requests right now, but I'm here to show what an integrated AI could look like!",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-4"
          >
            <Card className={cn("w-[350px] shadow-2xl border-border bg-card/95 backdrop-blur-sm", isMinimized ? "h-auto" : "h-[500px] flex flex-col")}>
              <CardHeader className="flex flex-row items-center space-y-0 pb-3 border-b border-border p-4 bg-muted/50 rounded-t-xl">
                <div className="flex items-center gap-2 flex-1">
                  <div className="bg-primary/20 p-2 rounded-full">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">RGM Assistant</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Online</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => setIsMinimized(!isMinimized)}
                  >
                    {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setIsOpen(false);
                      setIsMinimized(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              {!isMinimized && (
                <>
                  <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
                    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                      <div className="flex flex-col gap-4">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={cn(
                              "flex gap-3 max-w-[85%]",
                              message.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                            )}
                          >
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className={cn("text-xs", message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                                {message.role === "user" ? "ME" : <Bot className="h-4 w-4" />}
                              </AvatarFallback>
                            </Avatar>
                            <div
                              className={cn(
                                "rounded-2xl px-4 py-2 text-sm",
                                message.role === "user"
                                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                                  : "bg-muted text-foreground rounded-tl-sm"
                              )}
                            >
                              {message.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>

                  <CardFooter className="p-3 border-t border-border bg-background/50 rounded-b-xl">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                      }}
                      className="flex w-full items-center space-x-2"
                    >
                      <Input
                        type="text"
                        placeholder="Type a message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="flex-1 focus-visible:ring-1 bg-background"
                      />
                      <Button type="submit" size="icon" disabled={!input.trim()} className="h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                        <Send className="h-4 w-4" />
                        <span className="sr-only">Send</span>
                      </Button>
                    </form>
                  </CardFooter>
                </>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          onClick={() => {
            setIsOpen((prev) => !prev);
            if (isMinimized) setIsMinimized(false);
          }}
          className={cn(
            "h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300",
            isOpen && !isMinimized ? "bg-secondary text-secondary-foreground hover:bg-secondary/90 border border-border" : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {isOpen && !isMinimized ? (
            <X className="h-6 w-6" />
          ) : (
            <MessageSquare className="h-6 w-6" />
          )}
        </Button>
      </motion.div>
    </div>
  );
}

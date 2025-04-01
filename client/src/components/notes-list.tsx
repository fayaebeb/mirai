import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Note } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { FileText, Pencil, Trash2, Plus, Download, ExternalLink } from "lucide-react";
import { exportChatToPDF } from "@/lib/pdf-utils";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function NotesList() {
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [isEditNoteOpen, setIsEditNoteOpen] = useState(false);
  const [isViewNoteOpen, setIsViewNoteOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const { toast } = useToast();

  // Fetch notes
  const { data: notes = [], isLoading, isError } = useQuery<Note[]>({
    queryKey: ['/api/notes'],
  });

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      const response = await apiRequest('POST', '/api/notes', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      setIsAddNoteOpen(false);
      setNewNoteTitle("");
      setNewNoteContent("");
      toast({
        title: "Note created",
        description: "Your note has been successfully created.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error creating note",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: async (data: { id: number; title: string; content: string }) => {
      const { id, ...noteData } = data;
      const response = await apiRequest('PUT', `/api/notes/${id}`, noteData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      setIsEditNoteOpen(false);
      setCurrentNote(null);
      toast({
        title: "Note updated",
        description: "Your note has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating note",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/notes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      toast({
        title: "Note deleted",
        description: "Your note has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting note",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleAddNote = () => {
    if (!newNoteTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your note.",
        variant: "destructive",
      });
      return;
    }

    createNoteMutation.mutate({
      title: newNoteTitle,
      content: newNoteContent,
    });
  };

  const handleUpdateNote = () => {
    if (!currentNote) return;
    
    if (!newNoteTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your note.",
        variant: "destructive",
      });
      return;
    }

    updateNoteMutation.mutate({
      id: currentNote.id,
      title: newNoteTitle,
      content: newNoteContent,
    });
  };

  const handleEditNote = (note: Note) => {
    setCurrentNote(note);
    setNewNoteTitle(note.title);
    setNewNoteContent(note.content);
    setIsEditNoteOpen(true);
  };

  const handleViewNote = (note: Note) => {
    setCurrentNote(note);
    setIsViewNoteOpen(true);
  };

  const handleDeleteNote = (id: number) => {
    if (confirm("Are you sure you want to delete this note?")) {
      deleteNoteMutation.mutate(id);
    }
  };

  const handleExportNote = async (note: Note) => {
    try {
      // Create messages-like structure for PDF export
      const messages = [
        {
          id: 1,
          userId: 1,
          content: `# ${note.title}\n\n${note.content}`,
          isBot: false,
          timestamp: note.createdAt,
          sessionId: "notes",
        }
      ];

      await exportChatToPDF(
        messages as any, 
        `note-${note.id}-${note.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        {
          title: note.title,
          includeTimestamp: true,
          theme: "light"
        }
      );

      toast({
        title: "Note exported",
        description: "Your note has been exported as PDF.",
      });
    } catch (error) {
      console.error("Error exporting note:", error);
      toast({
        title: "Export failed",
        description: "An error occurred while exporting the note.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Notes
        </h2>
        <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              <span>Add Note</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Note
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Input
                  id="title"
                  placeholder="Note Title"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="grid gap-2">
                <Textarea
                  id="content"
                  placeholder="Note Content"
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  className="w-full min-h-[200px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => setIsAddNoteOpen(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddNote}
                disabled={createNoteMutation.isPending}
              >
                {createNoteMutation.isPending ? "Creating..." : "Create Note"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Separator />
      
      <Card className="p-0">
        {isLoading ? (
          <div className="p-4 text-center">Loading notes...</div>
        ) : isError ? (
          <div className="p-4 text-center text-red-500">Error loading notes</div>
        ) : notes.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-10 w-10 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No notes yet</p>
            <p className="text-muted-foreground">Create your first note by clicking the Add Note button.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Title</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {notes.map((note) => (
                  <motion.tr
                    key={note.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleViewNote(note)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        {note.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(note.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {format(new Date(note.updatedAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportNote(note);
                          }}
                          title="Export as PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditNote(note);
                          }}
                          title="Edit Note"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNote(note.id);
                          }}
                          title="Delete Note"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Edit note dialog */}
      <Dialog open={isEditNoteOpen} onOpenChange={setIsEditNoteOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Note
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Input
                id="edit-title"
                placeholder="Note Title"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="grid gap-2">
              <Textarea
                id="edit-content"
                placeholder="Note Content"
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                className="w-full min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Markdown formatting is preserved
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsEditNoteOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateNote}
              disabled={updateNoteMutation.isPending}
            >
              {updateNoteMutation.isPending ? "Updating..." : "Update Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View note dialog */}
      <Dialog open={isViewNoteOpen} onOpenChange={setIsViewNoteOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {currentNote?.title}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {currentNote && format(new Date(currentNote.updatedAt), 'MMM d, yyyy')}
                </Badge>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7"
                  onClick={() => currentNote && handleExportNote(currentNote)}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 overflow-auto">
            <div className="py-4 px-1 prose prose-sm prose-invert max-w-none">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ node, ...props }) => (
                    <table className="border-collapse border border-gray-700 w-full my-4" {...props} />
                  ),
                  th: ({ node, ...props }) => (
                    <th className="border border-gray-700 bg-gray-800 px-4 py-2 text-left" {...props} />
                  ),
                  td: ({ node, ...props }) => (
                    <td className="border border-gray-700 px-4 py-2" {...props} />
                  ),
                  a: ({ node, ...props }) => (
                    <a className="text-blue-400 hover:text-blue-300 underline" {...props} />
                  )
                }}
              >
                {currentNote?.content || ""}
              </ReactMarkdown>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-2">
            <Button
              onClick={() => setIsViewNoteOpen(false)}
              variant="outline"
            >
              Close
            </Button>
            <Button 
              onClick={() => {
                setIsViewNoteOpen(false);
                if (currentNote) {
                  handleEditNote(currentNote);
                }
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
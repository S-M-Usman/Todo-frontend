"use client"

import type React from "react"

import { useState, useEffect } from "react"
import axios from "axios"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from "date-fns"
import { Loader2, Pencil, Trash2 } from "lucide-react"
import { toast, Toaster } from "sonner"

interface Todo {
  _id: string
  userId: string
  title: string
  completed: boolean
  createdAt: string
  updatedAt: string
}

export default function TodosPage() {
  const router = useRouter()
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [newTodo, setNewTodo] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editTodo, setEditTodo] = useState<Todo | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editCompleted, setEditCompleted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [todoToDelete, setTodoToDelete] = useState<string | null>(null)

  // Check if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/sign-in")
    } else {
      fetchTodos()
    }
  }, [router])

  // Normalize todo data to ensure it has all required properties
  const normalizeTodo = (todo: any): Todo => {
    // If todo is undefined or null, return a default todo object
    if (!todo) {
      return {
        _id: `temp-${Date.now()}`, // Generate a temporary ID
        userId: "",
        title: "",
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }

    return {
      _id: todo._id || todo.id || `temp-${Date.now()}`,
      userId: todo.userId || "",
      title: todo.title || "",
      completed: typeof todo.completed === "boolean" ? todo.completed : false,
      createdAt: todo.createdAt || new Date().toISOString(),
      updatedAt: todo.updatedAt || new Date().toISOString(),
    }
  }

  // Extract todos from API response
  const extractTodosFromResponse = (response: any): any[] => {
    // Check if response has data property directly containing the todos array
    if (response && Array.isArray(response.data)) {
      return response.data
    }

    // Check if response.data has data property containing the todos array
    if (response && response.data && Array.isArray(response.data.data)) {
      return response.data.data
    }

    // If we can't find the todos array, log the response and return empty array
    console.warn("Unexpected API response format:", response)
    return []
  }

  // Fetch todos from API
  const fetchTodos = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const response = await axios.get("https://todo-backend-1dzp.onrender.com/api/v1/todos", {
        headers: { Authorization: `Bearer ${token}` },
      })

      // Extract todos from the response
      const todosData = extractTodosFromResponse(response)

      // Normalize the data to ensure it has the expected structure
      const normalizedTodos = todosData.map(normalizeTodo)
      setTodos(normalizedTodos)
    } catch (error) {
      console.error("Failed to fetch todos:", error)
      toast.error("Failed to load todos. Please try again.")
      setTodos([])
    } finally {
      setLoading(false)
    }
  }

  // Create new todo
  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTodo.trim()) return

    setIsSubmitting(true)
    try {
      const token = localStorage.getItem("token")
      const response = await axios.post(
        "http://localhost:5500/api/v1/todos",
        { title: newTodo },
        { headers: { Authorization: `Bearer ${token}` } },
      )

      // Extract the new todo from the response
      const todoData = response.data || response.data.data

      // Normalize the new todo data
      const newTodoData = normalizeTodo(todoData)
      setTodos([newTodoData, ...todos])
      setNewTodo("")
      toast.success("Todo created successfully!")
    } catch (error: any) {
      console.error("Failed to create todo:", error)

      // Create a temporary todo with the title
      const tempTodo = normalizeTodo({
        title: newTodo,
        completed: false,
      })

      // Add the temporary todo to the list (optimistic update)
      setTodos([tempTodo, ...todos])
      setNewTodo("")

      toast.warning("Todo may have been created, but we received an error from the server.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Open edit modal
  const handleEditClick = (todo: Todo) => {
    setEditTodo(todo)
    setEditTitle(todo.title || "")
    setEditCompleted(!!todo.completed)
    setEditModalOpen(true)
  }

  // Update todo
  const handleUpdateTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTodo || !editTitle.trim()) return

    setIsSubmitting(true)
    try {
      const token = localStorage.getItem("token")
      const response = await axios.put(
        `http://localhost:5500/api/v1/todos/${editTodo._id}`,
        { title: editTitle, completed: editCompleted },
        { headers: { Authorization: `Bearer ${token}` } },
      )

      // Extract the updated todo from the response
      const todoData = response.data || response.data.data

      // Normalize the updated todo data
      const updatedTodo = normalizeTodo(todoData)
      setTodos(todos.map((todo) => (todo._id === editTodo._id ? updatedTodo : todo)))
      setEditModalOpen(false)
      toast.success("Todo updated successfully!")
    } catch (error) {
      console.error("Failed to update todo:", error)

      // Update the todo optimistically
      const updatedTodo = {
        ...editTodo,
        title: editTitle,
        completed: editCompleted,
        updatedAt: new Date().toISOString(),
      }
      setTodos(todos.map((todo) => (todo._id === editTodo._id ? updatedTodo : todo)))
      setEditModalOpen(false)

      toast.warning("Todo may have been updated, but we received an error from the server.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Open delete confirmation
  const handleDeleteClick = (id: string) => {
    setTodoToDelete(id)
    setDeleteDialogOpen(true)
  }

  // Delete todo
  const handleDeleteTodo = async () => {
    if (!todoToDelete) return

    try {
      const token = localStorage.getItem("token")
      await axios.delete(`http://localhost:5500/api/v1/todos/${todoToDelete}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      setTodos(todos.filter((todo) => todo._id !== todoToDelete))
      toast.success("Todo deleted successfully!")
    } catch (error) {
      console.error("Failed to delete todo:", error)

      // Delete optimistically anyway
      setTodos(todos.filter((todo) => todo._id !== todoToDelete))

      toast.warning("Todo may have been deleted, but we received an error from the server.")
    } finally {
      setDeleteDialogOpen(false)
      setTodoToDelete(null)
    }
  }

  // Filter todos based on active tab with safety checks
  const filteredTodos = todos
    .filter((todo) => todo && typeof todo === "object")
    .filter((todo) => {
      if (activeTab === "completed") return !!todo.completed
      if (activeTab === "incomplete") return !todo.completed
      return true // "all" tab
    })

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>My Todo List</CardTitle>
          <CardDescription>Manage your tasks efficiently</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateTodo} className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Add a new todo..."
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <Button type="submit" disabled={isSubmitting || !newTodo.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Todo"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="incomplete">Incomplete</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredTodos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No todos found. Add a new one to get started!
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Status</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="hidden md:table-cell">Created</TableHead>
                      <TableHead className="hidden md:table-cell">Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTodos.map((todo) => (
                      <TableRow key={todo._id}>
                        <TableCell>
                          <Checkbox
                            checked={!!todo.completed}
                            onCheckedChange={async (checked) => {
                              try {
                                const token = localStorage.getItem("token")
                                const response = await axios.put(
                                  `http://localhost:5500/api/v1/todos/${todo._id}`,
                                  { completed: !!checked },
                                  { headers: { Authorization: `Bearer ${token}` } },
                                )

                                // Extract the updated todo from the response
                                const todoData = response.data || response.data.data

                                // Normalize the updated todo data
                                const updatedTodo = normalizeTodo(todoData)
                                setTodos(todos.map((t) => (t._id === todo._id ? updatedTodo : t)))
                              } catch (error) {
                                console.error("Failed to update todo status:", error)

                                // Update optimistically anyway
                                const updatedTodo = {
                                  ...todo,
                                  completed: !!checked,
                                  updatedAt: new Date().toISOString(),
                                }
                                setTodos(todos.map((t) => (t._id === todo._id ? updatedTodo : t)))

                                toast.warning(
                                  "Todo status may have been updated, but we received an error from the server.",
                                )
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className={todo.completed ? "line-through text-muted-foreground" : ""}>
                          {todo.title || ""}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {todo.createdAt ? format(new Date(todo.createdAt), "MMM dd, yyyy") : ""}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {todo.updatedAt ? format(new Date(todo.updatedAt), "MMM dd, yyyy") : ""}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="icon" onClick={() => handleEditClick(todo)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteClick(todo._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Todo Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Todo</DialogTitle>
            <DialogDescription>Make changes to your todo item here.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateTodo}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Todo title"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="completed"
                  checked={editCompleted}
                  onCheckedChange={(checked) => setEditCompleted(!!checked)}
                />
                <Label htmlFor="completed">Mark as completed</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !editTitle.trim()}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the todo item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTodo}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster position="bottom-right" />
    </div>
  )
}

"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import type { Client } from "@/lib/definitions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, useFirebase, useMemoFirebase } from "@/firebase";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collection } from "firebase/firestore";

const statusMap: { [key in Client['status']]: { text: string; className: string } } = {
  active: { text: "Ativo", className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100" },
  inactive: { text: "Inativo", className: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100" },
  late: { text: "Atrasado", className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100" },
};

export function ClientTable() {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const resellerId = user?.uid;

  const clientsCollection = useMemoFirebase(() => {
    if (!resellerId) return null;
    return collection(firestore, 'resellers', resellerId, 'clients');
  }, [firestore, resellerId]);

  const { data, isLoading } = useCollection<Client>(clientsCollection);


  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
             <Input placeholder="Filtrar clientes..." className="max-w-sm" />
             <Select>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="late">Atrasado</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Cliente
        </Button>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead>Data de Renovação</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6}>Carregando clientes...</TableCell></TableRow>}
            {data?.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell>{client.planId}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={statusMap[client.status]?.className}>
                    {statusMap[client.status]?.text}
                  </Badge>
                </TableCell>
                <TableCell>{client.renewalDate}</TableCell>
                <TableCell className="text-right">
                  R$ {client.paymentValue.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuItem>Editar</DropdownMenuItem>
                      <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Cliente</DialogTitle>
            <DialogDescription>
              Preencha as informações do novo cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Nome</Label>
              <Input id="name" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="plan" className="text-right">Plano</Label>
               <Select>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="basico">Plano Básico</SelectItem>
                    <SelectItem value="premium">Plano Premium</SelectItem>
                    <SelectItem value="trimestral">Plano Trimestral</SelectItem>
                </SelectContent>
            </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

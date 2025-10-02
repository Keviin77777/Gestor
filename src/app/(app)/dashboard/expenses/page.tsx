"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useAuth, useFirebase, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { useCollection } from "@/firebase/firestore/use-collection";
import type { Expense } from "@/lib/definitions";

export default function ExpensesPage() {
    const { firestore } = useFirebase();
    const { user } = useAuth();
    const resellerId = user?.uid;

    const expensesCollection = useMemoFirebase(() => {
        if (!resellerId) return null;
        return collection(firestore, 'resellers', resellerId, 'expenses');
    }, [firestore, resellerId]);

    const { data: expenses, isLoading } = useCollection<Expense>(expensesCollection);

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Gestão de Despesas</CardTitle>
                        <CardDescription>Acompanhe suas despesas fixas e variáveis.</CardDescription>
                    </div>
                    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Despesa</Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && <TableRow><TableCell colSpan={4}>Carregando despesas...</TableCell></TableRow>}
                        {expenses?.map((expense) => (
                            <TableRow key={expense.id}>
                                <TableCell>{expense.date}</TableCell>
                                <TableCell className="font-medium">{expense.description}</TableCell>
                                <TableCell>
                                    <Badge variant={expense.type === 'fixed' ? 'secondary' : 'outline'}>
                                        {expense.type === 'fixed' ? 'Fixa' : 'Variável'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">R$ {expense.value.toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export type FlowSlice = {
  id: string
  label: string
  amount: number
  kind: 'income' | 'housing' | 'equity' | 'expense' | 'cash' | 'sunk'
}

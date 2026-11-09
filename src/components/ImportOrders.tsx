'use client'
import CsvImporter from './CsvImporter'
import { prepareOrders, commitOrders, ORDER_TEMPLATE } from '@/lib/importOrders'
export default function ImportOrders() {
  return <CsvImporter title="Import orders from CSV" template={ORDER_TEMPLATE} filename="orders-template.csv" prepare={prepareOrders} commit={commitOrders}
    note="Import customers first so orders link to them. Product names must match your products exactly. Existing order numbers and transaction references are skipped, so you can safely re-run a file. Only enter real orders." />
}

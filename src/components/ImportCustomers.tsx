'use client'
import CsvImporter from './CsvImporter'
import { prepareCustomers, commitCustomers, CUSTOMER_TEMPLATE } from '@/lib/importCustomers'
export default function ImportCustomers() {
  return <CsvImporter title="Import customers and leads from CSV" template={CUSTOMER_TEMPLATE} filename="customers-template.csv" prepare={prepareCustomers} commit={commitCustomers}
    note="The first row must be column headers. Only add people you have a real relationship or reason to contact. Existing emails are skipped, so you can safely re-run a file." />
}

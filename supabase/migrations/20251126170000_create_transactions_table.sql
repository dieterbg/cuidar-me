-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    cost INT NOT NULL,
    transaction_type TEXT NOT NULL, -- 'purchase' or 'earn'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB -- Para vouchers, códigos, etc
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_patient_id ON transactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- Add RLS policies
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own transactions
CREATE POLICY "Users can view their own transactions" ON transactions
    FOR SELECT
    USING (auth.uid() IN (
        SELECT user_id FROM patients WHERE id = transactions.patient_id
    ));

-- Policy: Only server (service role) can insert transactions
-- Note: In Supabase, service role bypasses RLS, so we don't strictly need an INSERT policy for it,
-- but we should ensure regular users CANNOT insert.
-- By default, if no INSERT policy exists, users cannot insert.

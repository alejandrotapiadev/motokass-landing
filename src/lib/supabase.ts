import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.SUPABASE_URL!,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default supabase;
    
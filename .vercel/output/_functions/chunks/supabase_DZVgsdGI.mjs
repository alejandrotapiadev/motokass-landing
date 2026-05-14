import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  undefined                            ,
  undefined                                         
);

export { supabase as s };

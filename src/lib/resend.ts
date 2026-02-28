import { Resend } from "resend";

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export default resend;

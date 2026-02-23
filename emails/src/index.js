import { render } from '@react-email/render';
import { InviteEmail } from './InviteEmail.js';
import { MagicLinkEmail } from './MagicLinkEmail.js';
export async function renderInviteEmail(magicLink) {
    return render(InviteEmail({ magicLink }));
}
export async function renderMagicLinkEmail(magicLink) {
    return render(MagicLinkEmail({ magicLink }));
}

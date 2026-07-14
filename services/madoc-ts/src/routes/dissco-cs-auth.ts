// dissco-cs fork addition: JSON auth API for the dissco-cs frontend's own login/register/
// password pages. Mirrors routes/user/{register,login,forgot-password,reset-password}.ts,
// which stay untouched — see the isInvitationExpired/mapInvitationForForm note below.
import { v4 } from 'uuid';
import { InternationalString } from '@iiif/presentation-3';
import { createUserActivationEmail, createUserActivationText } from '../emails/user-activation-email';
import { createResetPasswordEmail, createResetPasswordText } from '../emails/reset-password-email';
import { UserInvitation } from '../extensions/site-manager/types';
import { generateId } from '../frontend/shared/capture-models/helpers/generate-id';
import { gatewayHost } from '../gateway/api.server';
import { RouteMiddleware } from '../types/route-middleware';
import { ConflictError } from '../utility/errors/conflict';
import { NotAuthorized } from '../utility/errors/not-authorized';
import { NotFound } from '../utility/errors/not-found';
import { RequestError } from '../utility/errors/request-error';
import { passwordHash } from '../utility/php-password-hash';
import { validateEmail } from '../utility/validate-email';

const DEFAULT_INVITATION_SITE_ROLE = 'viewer';
const DEFAULT_REGISTRATION_ROLE = 'researcher';
const DEFAULT_TRANSCRIBER_ROLE = 'transcriber';
const RESET_LINK_MAX_AGE_DAYS = 1;

function validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
  if (!password || password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters long' };
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one letter and one number' };
  }
  return { valid: true };
}

// Copied (not imported) from routes/user/register.ts's private helpers of the same name,
// so that file can stay 100% unmodified. Keep in sync manually if that logic changes.
function mapInvitationForForm(invitation: UserInvitation) {
  return {
    id: invitation.id,
    message: invitation.detail.message as InternationalString,
    role: invitation.detail.role,
    site_role: invitation.detail.site_role,
  };
}

function isInvitationExpired(invitation: UserInvitation | null): boolean {
  if (!invitation) {
    return false;
  }

  const hasUsageLimit = typeof invitation.detail.usesLeft === 'number';
  const hasNoUsesLeft = hasUsageLimit ? (invitation.detail.usesLeft as number) <= 0 : false;
  const hasDateExpired = invitation.expires ? new Date().getTime() > invitation.expires.getTime() : false;

  return hasNoUsesLeft || hasDateExpired;
}

async function findInvitation(context: any, code: string): Promise<UserInvitation | null> {
  const site = await context.siteManager.getSiteBySlug(context.params.slug);
  try {
    return await context.siteManager.getInvitation(code, site.id);
  } catch (error) {
    if (!(error instanceof NotFound)) {
      throw error;
    }
    return null;
  }
}

export const invitationJson: RouteMiddleware<{ slug: string }> = async context => {
  const code = context.query.code as string | undefined;
  if (!code) {
    throw new RequestError('Missing invitation code');
  }

  const invitation = await findInvitation(context, code);

  if (!invitation || isInvitationExpired(invitation)) {
    // Not a server error - an expired/unknown invitation code is an expected outcome the
    // frontend needs to read from the body, so this stays a 200 rather than 404/400.
    context.response.body = { expired: true };
    return;
  }

  context.response.body = mapInvitationForForm(invitation);
};

export const registerJson: RouteMiddleware<
  { slug: string },
  { name: string; email: string; capToken: string; code?: string; termsAccepted?: boolean }
> = async context => {
  const site = await context.siteManager.getSiteBySlug(context.params.slug);
  const systemConfig = await context.siteManager.getSystemConfig();
  const { name, email, capToken, code, termsAccepted } = context.requestBody;

  let invitation: UserInvitation | null = null;
  if (code) {
    invitation = await findInvitation(context, code);
    if (!invitation || isInvitationExpired(invitation)) {
      throw new RequestError('This invitation link is invalid or expired');
    }
  } else if (!systemConfig.enableRegistrations) {
    throw new RequestError('Registration is not enabled for this site');
  }

  const isValidCaptcha = capToken ? await context.captcha.validateToken(capToken) : false;
  if (!isValidCaptcha || !name?.trim() || !email?.trim() || !validateEmail(email)) {
    throw new RequestError('Invalid registration details');
  }

  const latestTerms = await context.siteManager.getLatestTerms(site.id);
  if (latestTerms && !termsAccepted) {
    throw new RequestError('You must accept the terms and conditions to register');
  }

  const alreadyExists = await context.siteManager.userEmailExists(email);
  if (alreadyExists) {
    throw new ConflictError('Email already registered');
  }

  const createdUser = await context.siteManager.createUser({
    name,
    email,
    role: invitation?.detail.role || DEFAULT_REGISTRATION_ROLE,
  });

  if (latestTerms) {
    await context.siteManager.acceptTerms(createdUser.id, latestTerms.id);
  }

  if (invitation) {
    await context.siteManager.createInvitationRedemption(code as string, createdUser.id, site.id);
    try {
      await context.siteManager.setUsersRoleOnSite(
        site.id,
        createdUser.id,
        invitation.detail.site_role || DEFAULT_INVITATION_SITE_ROLE
      );
    } catch (e) {
      console.log('Unable to set users role on the site.');
      console.log(e);
    }
  } else if (systemConfig.registeredUserTranscriber) {
    try {
      await context.siteManager.setUsersRoleOnSite(site.id, createdUser.id, DEFAULT_TRANSCRIBER_ROLE);
    } catch (e) {
      console.log('Unable to set users role to transcriber on the site.');
      console.log(e);
    }
  }

  const idHash = v4();
  const codeForUser = v4();
  const sharedHash = await passwordHash(codeForUser);

  await context.siteManager.resetUserPassword(idHash, sharedHash, createdUser.id, true);

  const resetLink = `${gatewayHost}/s/${site.slug}/set-password?c1=${codeForUser}&c2=${idHash}`;

  try {
    const vars = {
      resetLink,
      installationTitle: systemConfig.installationTitle,
      username: createdUser.name,
    };

    await context.mailer.sendMail(createdUser.email, {
      subject: `Activate your account`,
      text: createUserActivationText(vars),
      html: createUserActivationEmail(vars),
    });
  } catch (e) {
    console.log('Unable to send email');
    console.log(e);

    try {
      const siteAdmins = await context.siteManager.getUsersByRoles(site.id, ['admin'], true);
      for (const admin of siteAdmins) {
        try {
          await context.notifications.addNotification(
            {
              id: generateId(),
              title: `User registered`,
              summary: `${createdUser.name}: We were not able to send an email to this user. You can activate or generate password reset links.`,
              action: {
                id: 'user:admin',
                link: `urn:madoc:user:${createdUser.id}`,
              },
              user: admin.id,
            },
            site.id
          );
        } catch (err) {
          console.log('Not able to send notification');
          console.log(err);
        }
      }
    } catch (err) {
      console.log('Unable to list site admins');
    }

    context.response.body = { ok: true, emailSent: false };
    return;
  }

  context.response.body = { ok: true, emailSent: true };
};

export const loginJson: RouteMiddleware<{ slug: string }, { email: string; password: string }> = async context => {
  const { email, password } = context.requestBody;

  const resp = await context.siteManager.verifyLogin(email, password);
  if (!resp) {
    throw new NotAuthorized('Incorrect email or password');
  }

  const { user, sites } = resp;
  context.state.authenticatedUser = {
    role: user.role,
    name: user.name,
    id: user.id,
    sites,
  };

  context.response.body = { user: { id: user.id, name: user.name } };
};

export const forgotPasswordJson: RouteMiddleware<{ slug: string }, { email: string }> = async context => {
  const { email } = context.requestBody;

  try {
    const user = await context.siteManager.getUserByEmail(email);
    if (user.is_active) {
      const site = await context.siteManager.getSiteBySlug(context.params.slug);
      const systemConfig = await context.siteManager.getSystemConfig();

      const idHash = v4();
      const codeForUser = v4();
      const sharedHash = await passwordHash(codeForUser);

      await context.siteManager.resetUserPassword(idHash, sharedHash, user.id, false);

      const resetLink = `${gatewayHost}/s/${site.slug}/set-password?c1=${codeForUser}&c2=${idHash}`;

      const vars = {
        resetLink,
        installationTitle: systemConfig.installationTitle,
        username: user.name,
      };

      await context.mailer.sendMail(user.email, {
        subject: `Password reset`,
        text: createResetPasswordText(vars),
        html: createResetPasswordEmail(vars),
      });
    }
  } catch (e) {
    // Do nothing - never leak whether the email exists.
  }

  context.response.body = { ok: true };
};

export const setPasswordJson: RouteMiddleware<
  { slug: string },
  { c1: string; c2: string; password: string }
> = async context => {
  const { c1, c2, password } = context.requestBody;

  if (!c1 || !c2 || !password) {
    throw new RequestError('Missing required fields');
  }

  let resetRow;
  try {
    resetRow = await context.siteManager.getPasswordReset(c1, c2);
  } catch (e) {
    throw new RequestError('This link is invalid or has expired');
  }

  const shouldExpire = new Date();
  shouldExpire.setDate(shouldExpire.getDate() - RESET_LINK_MAX_AGE_DAYS);
  if (shouldExpire.getTime() > resetRow.created.getTime()) {
    throw new RequestError('This link is invalid or has expired');
  }

  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    throw new RequestError(strength.reason);
  }

  await context.siteManager.setUserPassword(c2, password);

  const resp = await context.siteManager.getVerifiedLogin(resetRow.userId);
  if (resp) {
    const { user, sites } = resp;
    context.state.authenticatedUser = {
      role: user.role,
      name: user.name,
      id: user.id,
      sites,
    };
  }

  context.response.body = { user: resp ? { id: resp.user.id, name: resp.user.name } : null };
};

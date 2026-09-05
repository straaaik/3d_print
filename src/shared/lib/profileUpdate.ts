export interface ProfileUpdateInput {
  currentEmail?: string | null;
  name: string;
  email: string;
  avatarColor?: string;
}

export interface ProfileUpdateResult {
  success: boolean;
  partial?: boolean;
  error?: string;
}

export interface ProfileUpdatePort {
  updateEmail: (email: string) => Promise<string | undefined>;
  updateProfile: (input: Pick<ProfileUpdateInput, 'name' | 'email' | 'avatarColor'>) => Promise<string | undefined>;
}

function partialProfileError(error: unknown): ProfileUpdateResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    success: false,
    partial: true,
    error: `Запрос на изменение email принят, но профиль не сохранён: ${message}`,
  };
}

export async function persistProfileUpdate(
  input: ProfileUpdateInput,
  port: ProfileUpdatePort
): Promise<ProfileUpdateResult> {
  let emailChangeAccepted = false;

  try {
    if (input.email !== input.currentEmail?.toLowerCase()) {
      const emailError = await port.updateEmail(input.email);
      if (emailError) return { success: false, error: emailError };
      emailChangeAccepted = true;
    }

    const profileError = await port.updateProfile(input);
    if (profileError) {
      return emailChangeAccepted
        ? partialProfileError(profileError)
        : { success: false, error: profileError };
    }

    return { success: true };
  } catch (error: unknown) {
    return emailChangeAccepted
      ? partialProfileError(error)
      : { success: false, error: error instanceof Error ? error.message : 'Ошибка обновления профиля' };
  }
}

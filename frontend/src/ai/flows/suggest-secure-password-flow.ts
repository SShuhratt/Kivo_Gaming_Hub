'use server';
/**
 * @fileOverview This file implements a Genkit flow to suggest strong and memorable password combinations.
 *
 * - suggestSecurePassword - A function that suggests a secure password based on optional criteria.
 * - SuggestSecurePasswordInput - The input type for the suggestSecurePassword function.
 * - SuggestSecurePasswordOutput - The return type for the suggestSecurePassword function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestSecurePasswordInputSchema = z.object({
  criteria: z
    .string()
    .optional()
    .describe(
      'Optional criteria or preferences for the password (e.g., "at least 12 characters", "include a special character", "easy to remember").'
    ),
});
export type SuggestSecurePasswordInput = z.infer<
  typeof SuggestSecurePasswordInputSchema
>;

const SuggestSecurePasswordOutputSchema = z.object({
  password: z.string().describe('A strong and memorable password suggestion.'),
});
export type SuggestSecurePasswordOutput = z.infer<
  typeof SuggestSecurePasswordOutputSchema
>;

export async function suggestSecurePassword(
  input: SuggestSecurePasswordInput
): Promise<SuggestSecurePasswordOutput> {
  return suggestSecurePasswordFlow(input);
}

const suggestSecurePasswordPrompt = ai.definePrompt({
  name: 'suggestSecurePasswordPrompt',
  input: { schema: SuggestSecurePasswordInputSchema },
  output: { schema: SuggestSecurePasswordOutputSchema },
  prompt: `You are an AI assistant specialized in generating strong and memorable password combinations.

Generate a single strong and memorable password. The password should be at least 12 characters long, include a mix of uppercase and lowercase letters, numbers, and special characters.

Prioritize memorability while maintaining high security. Do not include any explanation, just the generated password in the specified JSON format.

{{#if criteria}}
Consider the following criteria: {{{criteria}}}
{{/if}}
`,
});

const suggestSecurePasswordFlow = ai.defineFlow(
  {
    name: 'suggestSecurePasswordFlow',
    inputSchema: SuggestSecurePasswordInputSchema,
    outputSchema: SuggestSecurePasswordOutputSchema,
  },
  async (input) => {
    const { output } = await suggestSecurePasswordPrompt(input);
    if (!output) {
      throw new Error('Failed to generate a secure password.');
    }
    return output;
  }
);

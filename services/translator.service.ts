import { TRANSLATION_SOURCE_LANG, TRANSLATION_TARGET_LANG } from "@/lib/constants";
import { supabase } from "@/lib/supabase.config";
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";

export type TranslateResult =
  | { translatedText: string; error: null }
  | { translatedText: null; error: string };

export async function translateText(text: string): Promise<TranslateResult> {
  const { data, error } = await supabase.functions.invoke("translator", {
    body: {
      text: text.toLowerCase(),
      targetLanguage: TRANSLATION_TARGET_LANG,
      sourceLanguage: TRANSLATION_SOURCE_LANG,
    },
  });

  if (error) {
    let message = "Translation failed. The item will be added without a translation.";
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      if (body?.message) message = body.message;
    } else if (error instanceof FunctionsFetchError) {
      message = "Could not reach the translation service. Check your connection.";
    } else if (error instanceof FunctionsRelayError) {
      message = "Translation service is temporarily unavailable.";
    }
    return { translatedText: null, error: message };
  }

  return { translatedText: data?.translatedText ?? null, error: null };
}

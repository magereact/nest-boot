import { getRuntimeContext } from "@nest-boot/common";
import i18next, { i18n as I18next } from "i18next";

export const getI18next = (): I18next => {
  const ctx = getRuntimeContext();
  return ctx?.i18n || i18next;
};

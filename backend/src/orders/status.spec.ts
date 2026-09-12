import { OrderStatus } from '@prisma/client';
import { allowedTransitions, isTransitionAllowed, transitionError } from './status';

const {
  PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED,
} = OrderStatus;

describe('переходы статуса заказа', () => {
  it('линейный поток разрешён шаг за шагом', () => {
    expect(isTransitionAllowed(PENDING, CONFIRMED)).toBe(true);
    expect(isTransitionAllowed(CONFIRMED, PROCESSING)).toBe(true);
    expect(isTransitionAllowed(PROCESSING, SHIPPED)).toBe(true);
    expect(isTransitionAllowed(SHIPPED, DELIVERED)).toBe(true);
  });

  it('через шаг нельзя — иначе неоплаченный заказ выглядит завершённым', () => {
    // На DELIVERED начисляются VetPoints и заказ попадает в выручку.
    expect(isTransitionAllowed(PENDING, DELIVERED)).toBe(false);
    expect(isTransitionAllowed(PENDING, SHIPPED)).toBe(false);
    expect(isTransitionAllowed(CONFIRMED, DELIVERED)).toBe(false);
  });

  it('назад нельзя', () => {
    expect(isTransitionAllowed(SHIPPED, PROCESSING)).toBe(false);
    expect(isTransitionAllowed(DELIVERED, SHIPPED)).toBe(false);
    expect(isTransitionAllowed(CONFIRMED, PENDING)).toBe(false);
  });

  it('отмена доступна с любого шага до получения', () => {
    for (const from of [PENDING, CONFIRMED, PROCESSING, SHIPPED]) {
      expect(isTransitionAllowed(from, CANCELLED)).toBe(true);
    }
  });

  it('полученный и отменённый — конечные', () => {
    expect(allowedTransitions(DELIVERED)).toHaveLength(0);
    expect(allowedTransitions(CANCELLED)).toHaveLength(0);
    expect(isTransitionAllowed(DELIVERED, CANCELLED)).toBe(false);
    expect(isTransitionAllowed(CANCELLED, CONFIRMED)).toBe(false);
  });

  it('повтор того же статуса безвреден', () => {
    // Клиент мог отправить запрос дважды — падать на этом незачем.
    for (const s of Object.values(OrderStatus)) {
      expect(isTransitionAllowed(s, s)).toBe(true);
    }
  });

  it('у каждого статуса описаны переходы — добавленный в enum не останется без правила', () => {
    for (const s of Object.values(OrderStatus)) {
      expect(Array.isArray(allowedTransitions(s))).toBe(true);
    }
  });

  it('сообщение об ошибке подсказывает, что возможно', () => {
    const msg = transitionError(PENDING, DELIVERED);
    expect(msg).toContain('PENDING');
    expect(msg).toContain('DELIVERED');
    expect(msg).toContain('CONFIRMED');
  });

  it('для конечного статуса сообщение говорит именно это', () => {
    expect(transitionError(DELIVERED, PROCESSING)).toContain('конечном');
  });
});

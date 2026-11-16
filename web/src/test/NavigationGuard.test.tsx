import { render, fireEvent } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';

function Page({ busy }: { busy: boolean }) {
  useNavigationGuard(busy);
  return <a href="/converter/video">Editor</a>;
}

afterEach(() => vi.restoreAllMocks());

it('allows leaving only after confirmation is accepted', () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
  const page = render(<Page busy />);
  const link = page.getByText('Editor');
  let blocked = true;
  link.addEventListener('click', event => {
    blocked = event.defaultPrevented;
    event.preventDefault();
  });
  fireEvent.click(link);
  expect(confirm).toHaveBeenCalledOnce();
  expect(blocked).toBe(false);
  page.unmount();
});

it('blocks navigation when active work exists and leaving is declined', () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  const page = render(<Page busy />);
  expect(fireEvent.click(page.getByText('Editor'))).toBe(false);
  expect(confirm).toHaveBeenCalledOnce();
  page.unmount();
});

it('removes reload protection when processing completes', () => {
  const page = render(<Page busy />);
  expect(window.dispatchEvent(new Event('beforeunload', { cancelable: true }))).toBe(false);
  page.rerender(<Page busy={false} />);
  expect(window.dispatchEvent(new Event('beforeunload', { cancelable: true }))).toBe(true);
  page.unmount();
});

it('allows downloading the current work without asking to leave the page', () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  const page = render(<><Page busy /><a download href="/api/files/output/download">Download output</a></>);
  const download = page.getByText('Download output');
  download.addEventListener('click', e => e.preventDefault());
  fireEvent.click(download);
  expect(confirm).not.toHaveBeenCalled();
  page.unmount();
});

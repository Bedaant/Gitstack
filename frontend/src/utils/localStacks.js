const STACKS_KEY = 'gitstack_local_stacks';

// Notify other components (e.g. Header badge) when stacks change
const notifyChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('stacksUpdated'));
  }
};

export const saveStackLocally = (idea, stack) => {
  const stacks = getLocalStacks();
  const newStack = {
    stack_id: `local_${Date.now()}`,
    name: idea.length > 60 ? idea.slice(0, 57) + '...' : idea,
    idea,
    tools: stack,
    is_public: false,
    copy_count: 0,
    created_at: new Date().toISOString(),
    source: 'local',
  };
  stacks.unshift(newStack);
  localStorage.setItem(STACKS_KEY, JSON.stringify(stacks.slice(0, 20))); // keep last 20
  notifyChange();
  return newStack;
};

export const getLocalStacks = () => {
  try {
    return JSON.parse(localStorage.getItem(STACKS_KEY) || '[]');
  } catch {
    return [];
  }
};

export const deleteLocalStack = (stackId) => {
  const stacks = getLocalStacks().filter(s => s.stack_id !== stackId);
  localStorage.setItem(STACKS_KEY, JSON.stringify(stacks));
  notifyChange();
};

export const isStackSaved = (idea) => {
  return getLocalStacks().some(s => s.idea === idea);
};

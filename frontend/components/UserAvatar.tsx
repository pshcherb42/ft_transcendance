type UserAvatarProps = {
    username: string;
    avatarPath?: string | null;
    size?: 'sm' | 'md';
  };
  
  export default function UserAvatar({
    username,
    avatarPath,
    size = 'md',
  }: UserAvatarProps) {
    const sizeClass =
      size === 'sm'
        ? 'h-8 w-8 text-xs'
        : 'h-10 w-10 text-sm';
  
    const resolvedAvatar =
      avatarPath ??
      `https://api.dicebear.com/9.x/pixel-art/png?seed=${encodeURIComponent(
        username,
      )}`;
  
    return (
      <div
        className={`
          ${sizeClass}
          shrink-0
          overflow-hidden
          rounded-full
          bg-[#D9D5D1]
        `}
      >
        <img
          src={resolvedAvatar}
          alt={username}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
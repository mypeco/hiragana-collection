import { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { Sparkles, EditIcon, X } from '../components/Icons';
import { ICON_OPTIONS, USER_COLOR_OPTIONS } from '../data/kanaData';

export const ProfileSelect = ({ onSelect }) => {
  const [users, setUsers] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState(ICON_OPTIONS[0]);
  const [newColor, setNewColor] = useState(USER_COLOR_OPTIONS[0]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      setIsLoadingUsers(true);
      let localUsers = await db.users.toArray();
      for (const user of localUsers) {
        if (!user.profileId) {
          const newId = crypto.randomUUID();
          await db.users.put({ ...user, profileId: newId });
        }
      }
      localUsers = await db.users.toArray();
      setUsers(localUsers);
      setIsLoadingUsers(false);
    };
    loadUsers();
  }, []);

  const handleStartCreate = () => {
    setNewName('');
    setNewIcon(ICON_OPTIONS[0]);
    setNewColor(USER_COLOR_OPTIONS[0]);
    setEditingUser(null);
    setIsCreating(true);
  };

  const handleStartEdit = (user, e) => {
    e.stopPropagation();
    setNewName(user.name);
    setNewIcon(user.icon);
    setNewColor(user.color);
    setEditingUser(user);
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!newName.trim()) return;
    if (editingUser) {
      const updatedUser = { ...editingUser, name: newName.trim(), icon: newIcon, color: newColor };
      await db.users.put(updatedUser);
      setUsers(prev => prev.map(u => u.id === editingUser.id ? updatedUser : u));
      setIsCreating(false);
      setEditingUser(null);
    } else {
      const profileId = crypto.randomUUID();
      const newUser = { name: newName.trim(), icon: newIcon, color: newColor, profileId };
      const id = await db.users.add(newUser);
      onSelect({ ...newUser, id });
    }
  };

  const handleDeleteUser = async (userId, userName, e) => {
    e.stopPropagation();
    if (window.confirm(`${userName} の データを ぜんぶ けしますか？\n（けした データは もとにもどせません）`)) {
      await db.users.delete(userId);
      await db.settings.where({ userId }).delete();
      await db.practices.where({ userId }).delete();
      await db.bestShots.where({ userId }).delete();
      await db.readWords.where({ userId }).delete();
      setUsers(prev => prev.filter(u => u.id !== userId));
    }
  };

  if (isCreating) {
    return (
      <div className="p-6 max-w-md mx-auto min-h-screen flex flex-col items-center justify-center animate-fade-in">
        <h1 className="text-2xl font-bold mb-6 text-stone-800 font-kyokasho">
          {editingUser ? 'プロフィールを なおす' : 'あたらしく つくる'}
        </h1>
        <input type="text" placeholder="なまえ" value={newName} onChange={e => setNewName(e.target.value)}
          className="w-full text-center text-2xl p-4 rounded-xl border-4 border-amber-200 focus:border-amber-400 outline-none mb-6 font-kyokasho shadow-sm" />
        <div className="w-full mb-6">
          <p className="font-bold text-stone-500 mb-2 text-center">アイコンを えらぶ</p>
          <div className="grid grid-cols-6 gap-2 h-48 overflow-y-auto p-3 bg-white rounded-xl border-2 border-stone-100 shadow-inner">
            {ICON_OPTIONS.map(icon => (
              <button key={icon} onClick={() => setNewIcon(icon)}
                className={`text-3xl p-1 rounded-lg transition-transform ${newIcon === icon ? 'bg-amber-100 ring-4 ring-amber-400 scale-110' : 'hover:bg-stone-50'}`}>{icon}</button>
            ))}
          </div>
        </div>
        <div className="w-full mb-8">
          <p className="font-bold text-stone-500 mb-3 text-center">テーマカラーを えらぶ</p>
          <div className="flex gap-4 flex-wrap justify-center">
            {USER_COLOR_OPTIONS.map(color => (
              <button key={color.label} onClick={() => setNewColor(color)}
                className={`w-12 h-12 rounded-full ${color.class} ${color.border} shadow-sm border-2 transition-all flex items-center justify-center ${newColor.label === color.label ? 'ring-4 ring-stone-400 scale-110' : 'opacity-50 hover:opacity-100'}`} />
            ))}
          </div>
        </div>
        <div className="flex gap-4 w-full">
          <button onClick={() => { setIsCreating(false); setEditingUser(null); }}
            className="flex-1 py-4 rounded-full font-bold text-stone-500 bg-stone-100 active:scale-95 transition-transform">もどる</button>
          <button onClick={handleSave} disabled={!newName.trim()}
            className="flex-1 py-4 rounded-full font-bold text-white bg-amber-500 disabled:opacity-50 active:scale-95 shadow-md transition-transform">ほぞんする</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-md mx-auto min-h-screen flex flex-col items-center justify-center animate-fade-in">
      <h1 className="text-3xl font-bold mb-8 text-amber-600 font-kyokasho">だれが あそぶ？</h1>
      <div className="w-full space-y-4 mb-8">
        {users.length === 0 && <div className="text-center text-stone-400 font-bold py-8">まだ だれも いません</div>}
        {users.map(user => (
          <div key={user.id} className={`w-full flex flex-col p-4 rounded-2xl shadow-sm border-2 transition-transform hover:-translate-y-1 ${user.color.class} ${user.color.border}`}>
            <div className="flex items-center justify-between">
              <div onClick={() => onSelect(user)} className="flex items-center gap-4 flex-1 cursor-pointer active:scale-95 transition-transform">
                <div className="text-4xl bg-white/70 w-16 h-16 flex items-center justify-center rounded-full shadow-sm shrink-0">{user.icon}</div>
                <span className="text-2xl font-bold font-kyokasho tracking-widest">{user.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <button onClick={(e) => handleStartEdit(user, e)}
                  className="w-10 h-10 rounded-full bg-white/50 text-stone-500 hover:bg-amber-500 hover:text-white flex items-center justify-center transition-colors shadow-sm">
                  <EditIcon className="w-5 h-5"/>
                </button>
                <button onClick={(e) => handleDeleteUser(user.id, user.name, e)}
                  className="w-10 h-10 rounded-full bg-white/50 text-stone-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors shadow-sm">
                  <X className="w-5 h-5"/>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={handleStartCreate}
        className="flex items-center justify-center gap-2 w-full py-4 rounded-full font-bold text-stone-500 bg-white border-2 border-dashed border-stone-300 hover:bg-stone-50 active:scale-95 transition-transform">
        <Sparkles className="w-5 h-5"/> あたらしく つくる
      </button>
    </div>
  );
};

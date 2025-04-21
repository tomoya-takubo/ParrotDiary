// src/services/diaryService.ts
import { supabase } from '@/lib/supabase';

// 型定義
export interface DiaryEntry {
  entry_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  line1: string;
  line2: string;
  line3: string;
  tags: string[];
}

export interface TagWithCount {
  name: string;
  count: number;
}

// Supabaseから返ってくるデータの型定義
interface DiaryEntryData {
  entry_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  line1?: string;
  line2?: string;
  line3?: string;
}

// タグの使用履歴から取得されるデータの型定義
interface TagUsageData {
  entry_id: string;
  tag_id: string;
  tags?: {
    name?: string;
  };
}

// タグ情報の型定義
interface TagData {
  tag_id: string;
  name?: string;
}

/**
 * 日記関連のデータ取得サービス
 * Supabaseとの通信を担当します
 */
export const diaryService = {
  
  /**
   * ユーザーの日記エントリーを取得
   * @param userId ユーザーID
   * @param limit 取得件数（デフォルト100件）
   */
  async getUserDiaryEntries(userId: string, limit = 100): Promise<DiaryEntry[]> {
    try {
      console.log('DiaryService: ユーザー日記エントリー取得開始', { userId });
      
      // 最初に日記エントリーを取得
      const { data: entriesData, error: entriesError } = await supabase
        .from('diary_entries')
        .select(`
          entry_id,
          user_id,
          created_at,
          updated_at,
          line1,
          line2,
          line3
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (entriesError) {
        console.error('DiaryService: 日記エントリー取得エラー', entriesError);
        throw entriesError;
      }

      // 結果が空の場合は早期リターン
      if (!entriesData || entriesData.length === 0) {
        return [];
      }

      console.log(`DiaryService: ${entriesData.length}件の日記エントリーを取得`);

      // 型アサーションを使用して正しい型に変換
      const typedEntriesData = entriesData as DiaryEntryData[];

      // エントリーIDの配列を作成
      const entryIds = typedEntriesData.map(entry => entry.entry_id);

      // タグ使用履歴を取得
      const { data: tagUsagesData, error: tagUsagesError } = await supabase
        .from('tag_usage_histories')
        .select(`
          entry_id,
          tag_id,
          tags (
            name
          )
        `)
        .in('entry_id', entryIds);

      if (tagUsagesError) {
        console.error('DiaryService: タグ使用履歴取得エラー', tagUsagesError);
        // タグ情報がなくても日記は返せるので、空のタグ配列で続行
      }

      // エントリーごとのタグをマッピング
      const entryTagsMap: Record<string, string[]> = {};
      
      if (tagUsagesData) {
        // 型アサーションを使用して正しい型に変換
        const typedTagUsagesData = tagUsagesData as TagUsageData[];
        
        typedTagUsagesData.forEach(usage => {
          const entryId = usage.entry_id;
          
          if (!entryTagsMap[entryId]) {
            entryTagsMap[entryId] = [];
          }
          
          // タグが存在し、名前がある場合のみ追加
          if (usage.tags && usage.tags.name) {
            const tagName = String(usage.tags.name);
            if (!entryTagsMap[entryId].includes(tagName)) {
              entryTagsMap[entryId].push(tagName);
            }
          }
        });
      }

      // レスポンスデータを整形
      const formattedEntries: DiaryEntry[] = typedEntriesData.map(entry => {
        return {
          entry_id: String(entry.entry_id),
          user_id: String(entry.user_id),
          created_at: String(entry.created_at),
          updated_at: String(entry.updated_at),
          line1: String(entry.line1 || ''),
          line2: String(entry.line2 || ''),
          line3: String(entry.line3 || ''),
          tags: entryTagsMap[entry.entry_id] || []
        };
      });

      return formattedEntries;
    } catch (error) {
      console.error('DiaryService: 日記エントリー取得に失敗', error);
      return []; // エラー時は空配列を返す
    }
  },

  /**
   * ユーザーのタグ使用状況を取得
   * @param userId ユーザーID 
   */
  async getUserTags(userId: string): Promise<TagWithCount[]> {
    try {
      console.log('DiaryService: ユーザータグ取得開始', { userId });
      
      // まずユーザーのタグ使用履歴を取得
      const { data: usageData, error: usageError } = await supabase
        .from('tag_usage_histories')
        .select(`
          tag_id
        `)
        .eq('user_id', userId);

      if (usageError) {
        console.error('DiaryService: タグ使用履歴取得エラー', usageError);
        throw usageError;
      }

      // 使用されているタグIDがない場合は早期リターン
      if (!usageData || usageData.length === 0) {
        return [];
      }

      // 型変換
      interface TagUsage {
        tag_id: string;
      }
      
      const typedUsageData = usageData as TagUsage[];

      // タグIDの配列を作成し、重複を除去
      const tagIds = [...new Set(typedUsageData.map(usage => usage.tag_id))];

      // タグ情報を取得
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('tag_id, name')
        .in('tag_id', tagIds);

      if (tagsError) {
        console.error('DiaryService: タグ情報取得エラー', tagsError);
        throw tagsError;
      }

      // 型変換
      const typedTagsData = tagsData as TagData[];

      // タグの使用回数をカウント
      const tagCounts: Record<string, number> = {};
      typedUsageData.forEach(usage => {
        const tagId = usage.tag_id;
        if (!tagCounts[tagId]) {
          tagCounts[tagId] = 0;
        }
        tagCounts[tagId]++;
      });

      // レスポンスデータを整形
      const formattedTags: TagWithCount[] = typedTagsData.map(tag => ({
        name: String(tag.name || ''),
        count: Number(tagCounts[tag.tag_id] || 0)
      }));

      // 使用回数の多い順にソート
      formattedTags.sort((a, b) => b.count - a.count);

      console.log(`DiaryService: ${formattedTags.length}件のタグを取得`);
      return formattedTags;
    } catch (error) {
      console.error('DiaryService: タグ取得に失敗', error);
      return []; // エラー時は空配列を返す
    }
  },

  /**
   * 指定したIDの日記エントリーを取得
   * @param entryId 日記エントリーID
   */
  async getDiaryEntryById(entryId: string): Promise<DiaryEntry | null> {
    try {
      console.log('DiaryService: 日記エントリー詳細取得開始', { entryId });
      
      // 日記エントリーを取得
      const { data: entry, error: entryError } = await supabase
        .from('diary_entries')
        .select(`
          entry_id,
          user_id,
          created_at,
          updated_at,
          line1,
          line2,
          line3
        `)
        .eq('entry_id', entryId)
        .single();

      if (entryError) {
        console.error('DiaryService: 日記エントリー詳細取得エラー', entryError);
        throw entryError;
      }

      // 型変換
      const typedEntry = entry as DiaryEntryData;

      // タグ使用履歴を取得
      const { data: tagUsages, error: tagUsagesError } = await supabase
        .from('tag_usage_histories')
        .select(`
          tag_id,
          tags (
            name
          )
        `)
        .eq('entry_id', entryId);

      if (tagUsagesError) {
        console.error('DiaryService: タグ使用履歴取得エラー', tagUsagesError);
        // タグエラーは無視して続行
      }

      // タグ名の配列を作成
      const tags: string[] = [];
      if (tagUsages) {
        interface TagUsageWithTags {
          tags?: {
            name?: string;
          }
        }
        
        const typedTagUsages = tagUsages as TagUsageWithTags[];
        
        typedTagUsages.forEach(usage => {
          if (usage.tags && usage.tags.name) {
            const tagName = String(usage.tags.name);
            if (!tags.includes(tagName)) {
              tags.push(tagName);
            }
          }
        });
      }

      console.log('DiaryService: 日記エントリー詳細を取得', typedEntry.entry_id);

      return {
        entry_id: String(typedEntry.entry_id),
        user_id: String(typedEntry.user_id),
        created_at: String(typedEntry.created_at),
        updated_at: String(typedEntry.updated_at),
        line1: String(typedEntry.line1 || ''),
        line2: String(typedEntry.line2 || ''),
        line3: String(typedEntry.line3 || ''),
        tags
      };
    } catch (error) {
      console.error('DiaryService: 日記エントリー詳細取得に失敗', error);
      return null; // エラー時はnullを返す
    }
  },

  /**
   * 日記エントリーを削除する
   * @param entryId 削除する日記エントリーのID
   */
  async deleteEntry(entryId: string | number): Promise<boolean> {
    try {
      console.log('DiaryService: 日記エントリー削除開始', { entryId });
      
      // まずパロットの関連データを削除
      try {
        const { error: parrotDeleteError } = await supabase
          .from('diary_parrot_icons') // パロットデータのテーブル名（実際のテーブル名に合わせて変更する必要があります）
          .delete()
          .eq('entry_id', entryId);
        
        if (parrotDeleteError) {
          console.error('DiaryService: パロットデータ削除エラー', parrotDeleteError);
          // エラーを記録するが処理は続行
        }
      } catch (parrotError) {
        console.error('DiaryService: パロットデータ削除中のエラー', parrotError);
        // パロットデータ削除中のエラーは記録するが処理は続行
      }
      
      // タグ使用履歴を削除
      const { error: tagUsageDeleteError } = await supabase
        .from('tag_usage_histories')
        .delete()
        .eq('entry_id', entryId);
      
      if (tagUsageDeleteError) {
        console.error('DiaryService: タグ使用履歴削除エラー', tagUsageDeleteError);
        // タグ削除エラーは記録するが処理は続行
      }
      
      // 日記エントリーを削除
      const { error: entryDeleteError } = await supabase
        .from('diary_entries')
        .delete()
        .eq('entry_id', entryId);
      
      if (entryDeleteError) {
        console.error('DiaryService: 日記エントリー削除エラー', entryDeleteError);
        throw entryDeleteError;
      }
      
      console.log('DiaryService: 日記エントリー削除成功', { entryId });
      return true;
    } catch (error) {
      console.error('DiaryService: 日記エントリー削除に失敗', error);
      throw error; // エラーを上位に伝播
    }
  }
};

export default diaryService;
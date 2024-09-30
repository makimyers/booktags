'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Loki from 'lokijs'

import { Tags } from './Tags'

let db: Loki;
let bookmarks: Collection<any>;

interface Bookmark {
  name: string;
  url: string;
  count: number;
  tags: string[];
  $loki?: number;
}

export default function Home() {
  const [newBookmarkName, setNewBookmarkName] = useState('')
  const [newBookmarkUrl, setNewBookmarkUrl] = useState('')
  const [newTag, setNewTag] = useState('');
  const [bookmarkList, setBookmarkList] = useState<Bookmark[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const lokiAdapter = new Loki.LokiLocalStorageAdapter()
    db = new Loki('bookmarks.db', {
      adapter: lokiAdapter,
      autoload: true,
      autoloadCallback: () => {
        bookmarks = db.getCollection('bookmarks')
        if (bookmarks === null) {
          bookmarks = db.addCollection('bookmarks')
        }
        loadBookmarks()
      },
      autosave: true,
      autosaveInterval: 4000
    })

    return () => {
      db.close()
    }
  }, [])

  const loadBookmarks = () => {
    if (bookmarks) {
      const loadedBookmarks = bookmarks.chain()
        .find()
        .simplesort('count', { desc: true })
        .data()
      setBookmarkList(loadedBookmarks)
    }
  }

  const addBookmark = () => {
    if (newBookmarkName.trim() !== '' && newBookmarkUrl.trim() !== '' && bookmarks) {
      const tags = newTag
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag !== '')
      bookmarks.insert({
        name: newBookmarkName,
        url: newBookmarkUrl,
        count: 0,
        tags: tags
      })
      db.saveDatabase()
      setNewBookmarkName('')
      setNewBookmarkUrl('')
      setNewTag('')
      loadBookmarks()
    }
  }

  const deleteBookmark = (id: number) => {
    if (bookmarks) {
      bookmarks.removeWhere({ '$loki': id })
      db.saveDatabase()
      loadBookmarks()
    }
  }

  const getAllTags = () => {
    if (bookmarks) {
      const allTags = bookmarks.chain()
        .data()
        .flatMap(bookmark => bookmark.tags || [])
        .filter(tag => typeof tag === 'string' && tag.trim() !== '') // Filter out empty and non-string tags
      return Array.from(new Set(allTags))
    }
    return []
  }

  const handleTagSelect = (tag: string) => {
    if (tag === 'all') {
      setSelectedTags([]);
    } else if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const filteredBookmarks = selectedTags.length > 0
    ? bookmarkList.filter(bookmark =>
      selectedTags.every(tag =>
        Array.isArray(bookmark.tags) && bookmark.tags.includes(tag)
      )
    )
    : bookmarkList;

  const incrementCounter = (id: number) => {
    if (bookmarks) {
      const bookmark = bookmarks.findOne({ '$loki': id })
      if (bookmark) {
        bookmark.count = (bookmark.count || 0) + 1
        bookmarks.update(bookmark)
        db.saveDatabase()
        loadBookmarks()
      }
    }
  }

  const exportBookmarks = () => {
    if (bookmarks) {
      const data = JSON.stringify(bookmarks.data, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'bookmarks.json'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const importBookmarks = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && bookmarks) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        try {
          const importedData = JSON.parse(content)

          if (!Array.isArray(importedData)) {
            throw new Error('Imported data is not an array')
          }

          if (importedData.length === 0) {
            throw new Error('No bookmarks found in the imported data')
          }

          bookmarks.clear()
          importedData.forEach(bookmark => {
            if (bookmark.name && bookmark.url) {
              const { $loki, meta, ...cleanBookmark } = bookmark
              bookmarks.insert({
                ...cleanBookmark,
                count: cleanBookmark.count || 0,
                tags: cleanBookmark.tags || []
              })
            }
          })
          db.saveDatabase()
          loadBookmarks()
          alert('Bookmarks imported successfully!')
        } catch (error) {
          console.error('Error importing bookmarks:', error)
          alert(`Error importing bookmarks: ${error.message}. Please check the file format.`)
        }
      }
      reader.readAsText(file)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <Card className="w-[450px]">
        <CardHeader>
          <CardTitle>Bookmarks</CardTitle>
        </CardHeader>
        <CardContent>
          <Tags
            tags={getAllTags()}
            selectedTags={selectedTags}
            onTagSelect={handleTagSelect}
          />
          <div className="flex flex-col space-y-2 mb-4">
            <Input
              value={newBookmarkName}
              onChange={(e) => setNewBookmarkName(e.target.value)}
              placeholder="Enter bookmark name"
            />
            <Input
              value={newBookmarkUrl}
              onChange={(e) => setNewBookmarkUrl(e.target.value)}
              placeholder="Enter bookmark URL"
            />
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Enter tags (comma-separated)"
            />
            <Button onClick={addBookmark}>Add Bookmark</Button>
          </div>
          <div className="flex space-x-2 mb-4">
            <Button onClick={exportBookmarks}>Export</Button>
            <Button onClick={() => fileInputRef.current?.click()}>Import</Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={importBookmarks}
              style={{ display: 'none' }}
              accept=".json"
            />
          </div>
          <ul className="mt-4 space-y-2">
            {filteredBookmarks.map((bookmark) => (
              <li key={bookmark.$loki} className="flex flex-col">
                <div className="flex justify-between items-center">
                  <div>
                    <a
                      href={bookmark.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                      onClick={() => incrementCounter(bookmark.$loki)}
                    >
                      {bookmark.name}
                    </a>
                    <span className="ml-2 text-sm text-gray-500">(Clicks: {bookmark.count || 0})</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteBookmark(bookmark.$loki)}
                  >
                    Delete
                  </Button>
                </div>
                <Tags
                  tags={bookmark.tags || []}
                  selectedTags={selectedTags}
                  onTagSelect={handleTagSelect}
                />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  )
}
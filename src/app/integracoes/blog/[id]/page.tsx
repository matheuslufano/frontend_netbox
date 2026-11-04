import ArticleEditor from '../components/ArticleEditor';
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <ArticleEditor id={(await params).id} />; }

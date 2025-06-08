// ✅ EditReportPage.tsx (v2.4: PDF 페이지 분할 적용)
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnalyzedClause, getReportById, saveRevisedClauses } from '@/api/report';
import { useLoader } from '@/contexts/LoaderContext';
import { toast } from 'react-toastify';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { RichTextEditor } from '@mantine/rte';
import { fillTemplateFromResponse } from '@/utils/fillTemplate';

const EditReportPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showLoader, hideLoader } = useLoader();

  const [clauses, setClauses] = useState<AnalyzedClause[]>([]);
  const [reportId, setReportId] = useState('');
  const [error, setError] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [analysisText, setAnalysisText] = useState('');
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loading, setLoading] = useState(true);

  const state = location.state as { templateType?: string; variables?: Record<string, string> } | null;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const dataParam = params.get('data');
    const shouldUseStateTemplate = !!state?.templateType && !!state?.variables;

    if (!id && !shouldUseStateTemplate) {
      navigate('/upload');
      return;
    }
    if (id) setReportId(id);

    const fetch = async () => {
      try {
        showLoader();
        setLoading(true);
        if (shouldUseStateTemplate) {
          const filled = fillTemplateFromResponse({
            template: state.templateType!,
            variables: state.variables!,
          });
          if (filled) {
            setEditorContent(filled);
            setClauses([]);
            setAnalysisText('');
            setError('');
            return;
          }
        }
        const result = await getReportById(id!);
        setClauses(result.clauses || []);
        setAnalysisText(result.analysisSummary || '분석 결과가 없습니다.');
        if (!result.clauses || result.clauses.length === 0) setAnalysisText('');
        if (result.documentContent) setEditorContent(result.documentContent);
        else if (dataParam) {
          const parsed = JSON.parse(decodeURIComponent(dataParam));
          const filled = fillTemplateFromResponse(parsed);
          setEditorContent(filled ?? getDefaultTemplate());
        } else setEditorContent(getDefaultTemplate());
        setError('');
      } catch (err) {
        console.error(err);
        setClauses([
          {
            id: 'demo-1',
            original: '⚠️ 백엔드 연결 실패 - 예시 문장입니다.',
            revised: '',
            risk: '예시 위험',
            relatedCases: ['사건 예시 1', '사건 예시 2'],
          },
        ]);
        setError('⚠️ 백엔드 연결 실패: 예시 문장을 표시합니다.');
        setAnalysisText('⚠️ 백엔드 연결 실패로 인해 분석 결과가 없습니다.');
        setEditorContent(getDefaultTemplate());
      } finally {
        hideLoader();
        setLoading(false);
      }
    };
    fetch();
  }, [location.search, location.state, navigate, showLoader, hideLoader]);

  const getDefaultTemplate = (): string => `
    <h2 style="text-align:center;">내용증명서</h2>
    <p>■ 일 시:</p>
    <p>■ 수신자: (    -    )</p>
    <p>■ 주 소:</p>
    <p>■ 발신자: (    -    )</p>
    <p>■ 주 소:</p>
    <p>■ 제 목: 누락된 퇴직금지급 관련 내용증명</p>
    <p>1. 귀하(사)의 무궁한 발전을 기원합니다.</p>
    <p>2. 다음이 아니고 본인은 귀사에서 ...</p>
    <p>3. 본인은 퇴직후 지급받은 퇴직금을 확인해 본 결과 ...</p>
    <p>발신인 : (인)</p>
  `;

  const handleSave = async () => {
    try {
      showLoader();
      const updates = clauses
        .filter((c) => c.revised && c.revised !== c.original)
        .map((c) => ({ id: c.id, revised: c.revised || '' }));
      await saveRevisedClauses(reportId, updates, editorContent);
      toast.success('수정 내용이 성공적으로 저장되었습니다.');
    } catch (err) {
      console.error('❗ 저장 실패:', err);
      toast.error('저장 중 오류가 발생했습니다.');
    } finally {
      hideLoader();
    }
  };

  const handleDownloadPdf = async () => {
    setLoadingPdf(true);
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = editorContent;
      tempDiv.style.width = '800px';
      tempDiv.style.padding = '30px';
      tempDiv.style.backgroundColor = 'white';
      tempDiv.style.color = 'black';
      tempDiv.style.position = 'fixed';
      tempDiv.style.top = '-9999px';
      tempDiv.style.left = '-9999px';
      tempDiv.style.lineHeight = '1.6';
      document.body.appendChild(tempDiv);

      await new Promise((r) => setTimeout(r, 300)); // 렌더링 대기

      const canvas = await html2canvas(tempDiv, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;

      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let position = 0;
      let pageCount = Math.ceil(imgHeight / contentHeight);

      for (let i = 0; i < pageCount; i++) {
        const srcY = (i * canvas.height) / pageCount;
        const srcHeight = canvas.height / pageCount;

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = srcHeight;

        const ctx = pageCanvas.getContext('2d')!;
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcHeight, 0, 0, canvas.width, srcHeight);

        const pageImgData = pageCanvas.toDataURL('image/png');
        if (i > 0) pdf.addPage();
        pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, contentHeight);
      }

      pdf.save('edited_report.pdf');
      document.body.removeChild(tempDiv);
    } catch (err) {
      console.error(err);
      toast.error('PDF 다운로드에 실패했습니다.');
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <>
      {loading ? (
        <div className="fixed inset-0 flex items-center justify-center bg-white z-50" style={{ minHeight: '80vh' }}>
          <p className="text-lg text-gray-700">로딩 중입니다... 잠시만 기다려주세요.</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto py-8 px-4 grid grid-cols-12 gap-8 min-h-[80vh]">
          <div className="col-span-4 p-4 bg-blue-50 rounded shadow space-y-4 overflow-auto">
            <h3 className="text-xl font-semibold mb-4">📝 분석 결과 및 주의사항</h3>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <div className="text-sm whitespace-pre-wrap">{analysisText}</div>
            <div className="mt-6 space-y-4">
              {clauses.length > 0 ? (
                clauses.map((clause, idx) => (
                  <div key={idx} className="border p-3 rounded bg-white shadow-sm">
                    <p className="text-sm font-semibold mb-1">원본 조항</p>
                    <p className="text-sm whitespace-pre-wrap">{clause.original}</p>
                    {clause.risk && <p className="mt-2 text-xs text-red-600">⚠ 위험 요소: {clause.risk}</p>}
                    {clause.relatedCases?.length > 0 && (
                      <ul className="text-xs text-blue-600 mt-1 list-disc list-inside">
                        {clause.relatedCases.map((c, i) => (<li key={i}>{c}</li>))}
                      </ul>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 italic">현재 표시할 분석 조항이 없습니다.</p>
              )}
            </div>
          </div>

          <div className="col-span-8 p-4 bg-white rounded shadow flex flex-col h-[calc(80vh-4rem)]">
            <h3 className="text-xl font-semibold mb-4 flex-shrink-0">📄 문서 작성 및 수정</h3>
            <div className="flex-grow overflow-auto">
              <RichTextEditor
                value={editorContent}
                onChange={setEditorContent}
                controls={[[
                  'bold', 'italic', 'underline', 'strike', 'clean'
                ], [
                  'unorderedList', 'orderedList'
                ], [
                  'blockquote', 'code', 'link', 'image'
                ], [
                  'h1', 'h2', 'h3'
                ]]}
                style={{ height: '70vh' }}
              />
            </div>
            <div className="flex justify-end space-x-3 mt-4 flex-shrink-0">
              <button onClick={handleSave} className="px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                💾 저장하기
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={loadingPdf}
                className={`px-5 py-2 rounded text-white ${loadingPdf ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {loadingPdf ? '다운로드 중...' : 'PDF 다운로드'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EditReportPage;
